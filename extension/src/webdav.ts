import * as vscode from "vscode";
import { createClient, type BufferLike, type FileStat } from "webdav/web";

function toVscodeFileType(t: FileStat["type"]): vscode.FileType {
  switch (t) {
    case "file":
      return vscode.FileType.File;
    case "directory":
      return vscode.FileType.Directory;
    default:
      return vscode.FileType.Unknown;
  }
}

export class WebdavFs implements vscode.FileSystemProvider, vscode.Disposable {
  private getClient(uri: vscode.Uri) {
    const searchParams = new URLSearchParams(uri.query);
    const endpoint = searchParams.get("endpoint")!;
    const username = searchParams.get("username")!;
    const password = searchParams.get("password")!;

    return createClient(endpoint, {
      username,
      password,
    });
  }

  // --- manage file metadata
  async stat(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = (await client.stat(uri.path, {
      details: false,
    })) as FileStat;

    return {
      type: toVscodeFileType(resp.type),
      ctime: Number(resp.lastmod),
      mtime: Number(resp.lastmod),
      size: resp.size,
    } satisfies vscode.FileStat;
  }

  async readDirectory(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = (await client.getDirectoryContents(uri.path, {
      deep: false,
      details: true,
    })) as FileStat[];

    return resp.map((entry) => [entry.basename, toVscodeFileType(entry.type)] satisfies [string, vscode.FileType]);
  }

  // --- manage file contents

  async readFile(uri: vscode.Uri) {
    const client = this.getClient(uri);
    const resp = (await client.getFileContents(uri.path, {
      format: "binary",
      details: false,
    })) as string | BufferLike;
    return resp instanceof Uint8Array
      ? resp
      : resp instanceof ArrayBuffer
      ? new Uint8Array(resp)
      : new TextEncoder().encode(resp);
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }) {
    const client = this.getClient(uri);
    const res = await client.putFileContents(uri.path, Buffer.from(content), {
      overwrite: options.overwrite,
    });
    if (!res) {
      throw new Error("Failed to write file");
    }
  }

  // --- manage files/folders

  async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }) {
    if (oldUri.authority !== newUri.authority) {
      throw new Error("Cross-host renaming is not supported");
    }

    const client = this.getClient(oldUri);
    await client.moveFile(oldUri.path, newUri.path, {
      overwrite: options.overwrite,
    });
  }

  async delete(uri: vscode.Uri, options: { recursive: boolean }) {
    const client = this.getClient(uri);
    await client.deleteFile(uri.path);
  }

  async createDirectory(uri: vscode.Uri) {
    const client = this.getClient(uri);
    await client.createDirectory(uri.path);
  }

  async copy(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean }) {
    if (source.authority !== destination.authority) {
      throw new Error("Cross-host copying is not supported");
    }

    const client = this.getClient(source);
    await client.copyFile(source.path, destination.path, {
      overwrite: options.overwrite,
    });
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
