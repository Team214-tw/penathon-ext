// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as tempy from "tempy";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  let penathonArr: Array<string> = [];
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  let diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "penathon"
  );

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    let penathonResult;
    try {
      const penathon = execFileSync("python", ["main.py", document.fileName], {
        cwd: path.join(context.extensionUri.fsPath, "penathon"),
      });
      penathonResult = penathon.toString().replace("NoneType", "None");
    } catch (error) {
      vscode.window.showErrorMessage(error.message);
      return;
    }

    penathonArr = penathonResult.split("\n");
    penathonArr.shift();
    const fileName = tempy.file();
    vscode.window.showInformationMessage(fileName);
    fs.writeFileSync(fileName, penathonResult);

    diagnosticCollection.clear();
    let mypyResult: string;
    try {
      const mypy = execFileSync("mypy", [fileName]);
      vscode.window.showInformationMessage("No Error");
      return;
    } catch (error) {
      mypyResult = error.stdout.toString();
    }

    const regex = /.*:(\d)+: (.*)/gm;
    let m: RegExpExecArray | null;
    let editor = vscode.window.activeTextEditor;
    let diagnostics: vscode.Diagnostic[] = [];

    while ((m = regex.exec(mypyResult)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(parseInt(m[1]) - 2, 0, parseInt(m[1]) - 2, 10000),
          m[2],
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
    diagnosticCollection.set(document.uri, diagnostics);
  });

  vscode.languages.registerHoverProvider("python", {
    provideHover(doc: vscode.TextDocument, position, token) {
      return new vscode.Hover(penathonArr[position.line]);
    },
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
