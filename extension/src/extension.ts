/**
 * https://code.visualstudio.com/api/extension-guides/web-extensions
 * https://code.visualstudio.com/api/extension-guides/virtual-workspaces
 */

import * as vscode from "vscode";
import { WedbavFs } from "./wedbav";
import { WebdavFs } from "./webdav";

export async function activate(context: vscode.ExtensionContext) {
  console.log("Hello, WedbavFs!");

  // by default use wedbav
  const FS = context.storageUri?.scheme === "webdav" ? WebdavFs : WedbavFs;

  const fs = new FS();
  context.subscriptions.push(fs);
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider(context.storageUri!.scheme, fs, {
      isCaseSensitive: true,
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("wedbav.reset", async () => {
      vscode.window.showInformationMessage("TODO: wedbav");
    })
  );
}
