import * as vscode from "vscode";
import { parse as parseXml, isElementNode, type TNode } from "txml/txml";

/** WebDAV depth header values, per RFC 4918 §10.2. */
export type WebDAVDepth = "0" | "1" | "infinity";

export interface WebDAVClientOptions {
  /** Absolute base URL of the WebDAV endpoint, e.g. `https://dav.example.net/remote.php/dav`. */
  baseURL: string;
  username?: string;
  password?: string;
}

export interface WebDAVStat {
  /** Server-relative, decoded path (always starts with `/`, never trailing-slashed except root). */
  path: string;
  /** Last path segment, decoded. */
  name: string;
  /** Last modification time in epoch milliseconds, or `0` when the server omits it. */
  mtime: number;
  size: number;
  type: "file" | "directory";
}

/** PROPFIND body requesting the minimal set of properties this client consumes. */
const PROPFIND_BODY = `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:">
  <prop>
    <resourcetype/>
    <getlastmodified/>
    <getcontentlength/>
  </prop>
</propfind>`;

/** Local name of a possibly namespace-prefixed tag, e.g. `d:href` -> `href`. */
function localName(tagName: string): string {
  const colon = tagName.indexOf(":");
  return (colon === -1 ? tagName : tagName.slice(colon + 1)).toLowerCase();
}

/** Direct child elements matching `name` (namespace-agnostic). */
function findElements(children: (TNode | string)[], name: string): TNode[] {
  return children.filter((child): child is TNode => isElementNode(child) && localName(child.tagName) === name);
}

/** First descendant/child element matching `name`, searched breadth-first. */
function findElement(children: (TNode | string)[], name: string): TNode | undefined {
  return findElements(children, name)[0];
}

/** Concatenated text content of the first child element matching `name`, trimmed. */
function childText(parent: TNode, name: string): string {
  const element = findElement(parent.children, name);
  if (!element) {
    return "";
  }
  return element.children
    .filter((child): child is string => typeof child === "string")
    .join("")
    .trim();
}

/**
 * A minimal WebDAV client targeting the operations required by a VS Code
 * `FileSystemProvider`. XML is parsed with `txml` (a tiny, dependency-free
 * parser that works in the extension's web-worker host, where `DOMParser`
 * is unavailable) rather than with regular expressions.
 */
export class WebDAVClient {
  private readonly base: URL;
  private readonly authorization?: string;

  constructor(options: WebDAVClientOptions) {
    if (!options.baseURL) {
      throw vscode.FileSystemError.Unavailable("WebDAV baseURL is required");
    }

    const base = new URL(options.baseURL);
    base.hash = "";
    base.search = "";
    if (!base.pathname.endsWith("/")) {
      base.pathname += "/";
    }
    this.base = base;

    if (options.username != null && options.password != null) {
      const encoded = btoa(unescape(encodeURIComponent(`${options.username}:${options.password}`)));
      this.authorization = `Basic ${encoded}`;
    }
  }

  async stat(path: string): Promise<WebDAVStat> {
    const stats = await this.propfind(path, "0");
    const target = this.toServerPath(path);
    const match = stats.find((stat) => stat.path === target) ?? stats[0];

    if (!match) {
      throw vscode.FileSystemError.FileNotFound(path);
    }
    return match;
  }

  async list(path: string): Promise<WebDAVStat[]> {
    const stats = await this.propfind(path, "1");
    const target = this.toServerPath(path);
    // Depth-1 responses include the collection itself; drop it.
    return stats.filter((stat) => stat.path !== target);
  }

  async read(path: string): Promise<Uint8Array> {
    const response = await this.request("GET", path);
    return new Uint8Array(await response.arrayBuffer());
  }

  async write(path: string, content: Uint8Array<ArrayBuffer>): Promise<void> {
    await this.request("PUT", path, { body: content });
  }

  async makeDirectory(path: string): Promise<void> {
    await this.request("MKCOL", path);
  }

  async remove(path: string): Promise<void> {
    await this.request("DELETE", path, { allowStatus: [404] });
  }

  async move(from: string, to: string, overwrite: boolean): Promise<void> {
    await this.request("MOVE", from, {
      headers: { Destination: this.resolve(to).toString(), Overwrite: overwrite ? "T" : "F" },
    });
  }

  async copy(from: string, to: string, overwrite: boolean): Promise<void> {
    await this.request("COPY", from, {
      headers: { Destination: this.resolve(to).toString(), Overwrite: overwrite ? "T" : "F" },
    });
  }

  /** Resolve a server path to an absolute request URL under the base. */
  private resolve(path: string): URL {
    return new URL(path.replace(/^\/+/, ""), this.base);
  }

  private async request(
    method: string,
    path: string,
    options: { headers?: Record<string, string>; body?: BodyInit; allowStatus?: number[] } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = { ...options.headers };
    if (this.authorization) {
      headers.Authorization = this.authorization;
    }

    const response = await fetch(this.resolve(path).toString(), {
      method,
      headers,
      body: options.body,
    });

    if (!response.ok && !options.allowStatus?.includes(response.status)) {
      throw this.toFileSystemError(method, path, response.status, response.statusText);
    }
    return response;
  }

  private async propfind(path: string, depth: WebDAVDepth): Promise<WebDAVStat[]> {
    const response = await this.request("PROPFIND", path, {
      headers: { "Content-Type": "application/xml; charset=utf-8", Depth: depth },
      body: PROPFIND_BODY,
    });
    return this.parseMultiStatus(await response.text());
  }

  private parseMultiStatus(xml: string): WebDAVStat[] {
    let nodes: (TNode | string)[];
    try {
      nodes = parseXml(xml, { decodeEntities: true });
    } catch {
      throw vscode.FileSystemError.Unavailable("Malformed WebDAV multistatus response");
    }

    const multistatus = findElement(nodes, "multistatus");
    if (!multistatus) {
      throw vscode.FileSystemError.Unavailable("Missing <multistatus> in WebDAV response");
    }

    const stats: WebDAVStat[] = [];
    for (const response of findElements(multistatus.children, "response")) {
      const href = childText(response, "href");
      if (!href) {
        continue;
      }

      const prop = this.okProp(response);
      if (!prop) {
        continue;
      }

      const path = this.toServerPath(href);
      const resourceType = findElement(prop.children, "resourcetype");
      const isDirectory = !!resourceType && !!findElement(resourceType.children, "collection");
      const lastmod = childText(prop, "getlastmodified");
      const parsedMtime = lastmod ? Date.parse(lastmod) : NaN;

      stats.push({
        path,
        name: path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1),
        type: isDirectory ? "directory" : "file",
        mtime: Number.isFinite(parsedMtime) ? parsedMtime : 0,
        size: Number.parseInt(childText(prop, "getcontentlength"), 10) || 0,
      });
    }
    return stats;
  }

  /** Return the `<prop>` element from the first `2xx` `<propstat>`, if any. */
  private okProp(response: TNode): TNode | undefined {
    for (const propstat of findElements(response.children, "propstat")) {
      const status = childText(propstat, "status");
      if (status === "" || / 2\d\d /.test(status)) {
        return findElement(propstat.children, "prop");
      }
    }
    return undefined;
  }

  /**
   * Convert an href or input path into a decoded, base-relative server path
   * that always starts with `/` and has no trailing slash (except root).
   */
  private toServerPath(hrefOrPath: string): string {
    let pathname: string;
    try {
      pathname = new URL(hrefOrPath, this.base).pathname;
    } catch {
      pathname = hrefOrPath;
    }

    const basePath = this.base.pathname.replace(/\/+$/, "");
    if (basePath && (pathname === basePath || pathname.startsWith(`${basePath}/`))) {
      pathname = pathname.slice(basePath.length);
    }

    pathname = this.decode(pathname).replace(/\/+$/, "");
    if (!pathname) {
      return "/";
    }
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }

  private decode(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private toFileSystemError(method: string, path: string, status: number, statusText: string): vscode.FileSystemError {
    const detail = `${method} ${path} failed: ${status} ${statusText}`;
    switch (status) {
      case 401:
      case 403:
        return vscode.FileSystemError.NoPermissions(detail);
      case 404:
        return vscode.FileSystemError.FileNotFound(detail);
      case 405:
      case 409:
      case 412:
        return vscode.FileSystemError.FileExists(detail);
      default:
        return vscode.FileSystemError.Unavailable(detail);
    }
  }
}
