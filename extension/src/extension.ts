/**
 * https://code.visualstudio.com/api/extension-guides/web-extensions
 * https://code.visualstudio.com/api/extension-guides/virtual-workspaces
 */

import * as vscode from "vscode";
import { WebdavFs } from "./webdav";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Hello, WebdavFs!");

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("webdav", new WebdavFs(), {
      isCaseSensitive: true,
    })
  );
}
