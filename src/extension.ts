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
  const old2NewLineMap = new Map<number, number>();
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  let diagnosticCollection = vscode.languages.createDiagnosticCollection(
    "penathon"
  );

  vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
    let penathonResult: string;
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
    const fileName = tempy.file();
    vscode.window.showInformationMessage(fileName);

    let curNewLine = 1,
      curOldLine = 0;

    const new2OldLineMap = new Map<number, number>();
    for (const line of penathonArr) {
      const regex = /# line: (\d+)/m;
      const m = regex.exec(line);
      if (m !== null) {
        curOldLine = parseInt(m[1]);
      } else {
        new2OldLineMap.set(curNewLine, curOldLine);
        old2NewLineMap.set(curOldLine, curNewLine);
      }
      curNewLine++;
    }

    fs.writeFileSync(fileName, penathonResult);

    diagnosticCollection.clear();
    let mypyResult: string;
    try {
      execFileSync("mypy", [fileName]);
      vscode.window.showInformationMessage("No Error");
      return;
    } catch (error) {
      mypyResult = error.stdout.toString();
    }

    const regex = /.*:(\d+): (.*)/gm;
    let m: RegExpExecArray | null;
    let editor = vscode.window.activeTextEditor;
    let diagnostics: vscode.Diagnostic[] = [];

    while ((m = regex.exec(mypyResult)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      diagnostics.push(
        new vscode.Diagnostic(
          new vscode.Range(
            (new2OldLineMap.get(parseInt(m[1])) ?? 0) - 1,
            0,
            (new2OldLineMap.get(parseInt(m[1])) ?? 0) - 1,
            10000
          ),
          m[2],
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
    diagnosticCollection.set(document.uri, diagnostics);
  });

  vscode.languages.registerHoverProvider("python", {
    provideHover(doc: vscode.TextDocument, position, token) {
      const newLine = old2NewLineMap.get(position.line + 1);
      if (newLine) {
        return new vscode.Hover(penathonArr[newLine - 1]);
      }
    },
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
