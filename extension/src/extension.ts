/**
 * https://code.visualstudio.com/api/extension-guides/web-extensions
 * https://code.visualstudio.com/api/extension-guides/virtual-workspaces
 */

import * as vscode from "vscode";
import { WedbavFs } from "./wedbav";
import { WebdavFs } from "./webdav";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Hello, WedbavFs!");

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("wedbav", new WedbavFs(), {
      isCaseSensitive: true,
    })
  );

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("webdav", new WebdavFs(), {
      isCaseSensitive: true,
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("wedbav.reset", async () => {
      vscode.window.showInformationMessage("TODO: wedbav");
    })
  );
}
