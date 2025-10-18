/**
 * https://code.visualstudio.com/api/extension-guides/web-extensions
 * https://code.visualstudio.com/api/extension-guides/virtual-workspaces
 */

import * as vscode from "vscode";
import { createClient, type NormalizeOAS } from "fets";
import { Base64 } from "js-base64";
import openapi from "./openapi";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Hello, WedbavFs!");

  const fs = new WedbavFs();
  context.subscriptions.push(fs);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("wedbav", fs, {
      isCaseSensitive: true,
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("wedbav.reset", async () => {
      vscode.window.showInformationMessage("TODO: wedbav");
    })
  );
}

export class WedbavFs implements vscode.FileSystemProvider, vscode.Disposable {
  private getClient(uri: vscode.Uri) {
    const searchParams = new URLSearchParams(uri.query);
    const endpoint = searchParams.get("endpoint")!;
    const username = searchParams.get("username")!;
    const password = searchParams.get("password")!;

    return createClient<NormalizeOAS<typeof openapi>>({
      globalParams: {
        headers: { Authorization: `Basic ${btoa(`${username}:${password}`)}`, Accept: "application/json" },
      },
      endpoint,
      fetchFn: async (input, init) => {
        const req = new Request(input, init);
        try {
          const res = await fetch(req);
          if (!res.ok) {
            vscode.window.showInformationMessage(
              `WedbavFs: Not OK when ${req.method} ${req.url}\n${res.status} ${res.statusText}`
            );
          }
          return res;
        } catch (err) {
          vscode.window.showInformationMessage(`WedbavFs: Failed to ${req.method} ${req.url}\n${err}`);
          throw err;
        }
      },
    });
  }

  // --- manage file metadata
  async stat(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = await client["/api/v1/stat"].post({
      json: { path: uri.path },
    });

    if (resp.status === 404) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }

    return resp.json();
  }

  async readDirectory(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = await client["/api/v1/readDirectory"].post({
      json: { path: uri.path },
    });

    if (resp.status === 404) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    const body = await resp.json();
    const entries: [string, vscode.FileType][] = body.map((entry) => [entry.name, entry.type]);
    return entries;
  }

  // --- manage file contents

  async readFile(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = await client["/api/v1/readFile"].post({
      json: { path: uri.path },
    });

    if (resp.status === 404) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }

    const body = await resp.json();
    return Base64.toUint8Array(body.b64);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }) {
    const client = this.getClient(uri);
    const b64 = Base64.fromUint8Array(content);
    const res = await client["/api/v1/writeFile"].post({
      json: { path: uri.path, b64, options },
    });

    if (!res.ok) {
      throw new Error(res.statusText);
    }
  }

  // --- manage files/folders

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }) {
    if (oldUri.authority !== newUri.authority) {
      throw new Error("Cross-host renaming is not supported");
    }

    const client = this.getClient(oldUri);
    const resp = await client["/api/v1/rename"].post({
      json: { oldPath: oldUri.path, newPath: newUri.path, options },
    });

    if (resp.status === 404) {
      throw vscode.FileSystemError.FileNotFound(oldUri);
    }

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }) {
    const client = this.getClient(uri);
    const resp = await client["/api/v1/delete"].post({
      json: { path: uri.path, options },
    });

    if (resp.status === 404) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
  }

  async createDirectory(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = await client["/api/v1/createDirectory"].post({
      json: { path: uri.path },
    });

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
  }

  async copy(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean }) {
    if (source.authority !== destination.authority) {
      throw new Error("Cross-host copying is not supported");
    }

    const client = this.getClient(source);
    const resp = await client["/api/v1/copy"].post({
      json: { source: source.path, destination: destination.path, options },
    });

    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
  }

  private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

  watch(_resource: vscode.Uri): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => {});
  }

  dispose() {
    this._emitter.dispose();
  }
}
