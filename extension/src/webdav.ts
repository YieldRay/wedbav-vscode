import * as vscode from "vscode";
import { WebDAVClient, type WebDAVStat } from "./webdav-client";

const FILE_TYPE: Record<WebDAVStat["type"], vscode.FileType> = {
  file: vscode.FileType.File,
  directory: vscode.FileType.Directory,
};

/**
 * Backs `webdav://` workspaces. Connection details (endpoint/username/password)
 * travel in the URI query string, so each authority maps to one cached client.
 */
export class WebdavFs implements vscode.FileSystemProvider {
  private readonly clients = new Map<string, WebDAVClient>();
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  readonly onDidChangeFile = this.emitter.event;

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const stat = await this.client(uri).stat(uri.path);
    return this.toFileStat(stat);
  }

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const entries = await this.client(uri).list(uri.path);
    return entries.map((entry) => [entry.name, FILE_TYPE[entry.type]]);
  }

  readFile(uri: vscode.Uri): Promise<Uint8Array> {
    return this.client(uri).read(uri.path);
  }

  writeFile(uri: vscode.Uri, content: Uint8Array<ArrayBuffer>): Promise<void> {
    return this.client(uri).write(uri.path, content);
  }

  createDirectory(uri: vscode.Uri): Promise<void> {
    return this.client(uri).makeDirectory(uri.path);
  }

  delete(uri: vscode.Uri): Promise<void> {
    return this.client(uri).remove(uri.path);
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
    this.assertSameHost(oldUri, newUri, "rename");
    return this.client(oldUri).move(oldUri.path, newUri.path, options.overwrite);
  }

  copy(source: vscode.Uri, destination: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
    this.assertSameHost(source, destination, "copy");
    return this.client(source).copy(source.path, destination.path, options.overwrite);
  }

  watch(): vscode.Disposable {
    // The server offers no change notifications; nothing to watch.
    return new vscode.Disposable(() => {});
  }

  dispose(): void {
    this.emitter.dispose();
    this.clients.clear();
  }

  private toFileStat(stat: WebDAVStat): vscode.FileStat {
    return {
      type: FILE_TYPE[stat.type],
      ctime: stat.mtime,
      mtime: stat.mtime,
      size: stat.size,
    };
  }

  private assertSameHost(a: vscode.Uri, b: vscode.Uri, operation: string): void {
    if (a.authority !== b.authority) {
      throw vscode.FileSystemError.NoPermissions(`Cross-host ${operation} is not supported`);
    }
  }

  /** Resolve (and cache) the WebDAV client for the connection encoded in `uri`. */
  private client(uri: vscode.Uri): WebDAVClient {
    const cached = this.clients.get(uri.authority);
    if (cached) {
      return cached;
    }

    const params = new URLSearchParams(uri.query);
    const endpoint = params.get("endpoint");
    if (!endpoint) {
      throw vscode.FileSystemError.Unavailable("Missing WebDAV endpoint in workspace URI");
    }

    const client = new WebDAVClient({
      baseURL: endpoint,
      username: params.get("username") ?? undefined,
      password: params.get("password") ?? undefined,
    });
    this.clients.set(uri.authority, client);
    return client;
  }
}
