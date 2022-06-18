
namespace Moduless
{
	/** */
	function runFromCommandLine()
	{
		const cli = require("cac")();
		
		cli
			.command("", "Run the cover function that was set previously.")
			.action(async () =>
			{
				await runAssigned();
			});
		
		cli
			.command("all <regular_expression>", 
				"Run many cover functions in series, optionally filtering by those " +
				"whose function names conform to a regular expression.")
			.action(async (regular_expression: string) =>
			{
				await runAll(regular_expression || "");
			});
		
		cli
			.command("call <function_name>", "Run a specific cover function by name.")
			.action(async (function_name: string) =>
			{
				console.log("Running cover function: " + function_name);
				await run(function_name);
			});
		
		cli
			.command("set <location>", "Set a line within a source file to start running (/path/to/file.ts:123)")
			.action((location: string) =>
			{
				let [coverFilePath, lineNumText] = location.split(":");
				let lineIdx = 0;
				if (!lineNumText || !(lineIdx = parseInt(lineNumText, 10)) || lineIdx < 1)
					return Util.error("Input is expected to be in the form: /path/to/file.ts:123");
				
				coverFilePath = Path.resolve(coverFilePath);
				if (!Fs.existsSync(coverFilePath))
					return Util.error("Code file does not exist: " + coverFilePath);
				
				const codeFileText = Fs.readFileSync(coverFilePath).toString("utf8");
				const codeFileLines = codeFileText.split("\n");
				const specifiedLine = codeFileLines[lineIdx - 1];
				const functionName = Util.getFunctionNameFromLine(specifiedLine);
				
				if (functionName === "")
				{
					console.error("Could not parse the line: " + specifiedLine);
					return;
				}
				
				Settings.writeSetFunctionName(coverFilePath, functionName);
				console.log(`Moduless will now run ${functionName}() in ${coverFilePath} by default.`);
			});
		
		cli.help();
		cli.parse();
	}
	
	/** */
	async function runAssigned()
	{
		const cwd = process.cwd();
		const coverFunctionName = Settings.readSetFunction(cwd);
		await run(coverFunctionName);
	}
	
	/** */
	async function runAll(regexStr: string)
	{
		if (regexStr)
		{
			console.log("Running cover functions conforming to: " + regexStr);
			const regExp = new RegExp(regexStr);
			await run(regExp);
		}
		else
		{
			console.log("Running all discoverable cover functions");
			await run();
		}
	}
	
	/** */
	async function run(coverFunctionName: RegExp | string = "")
	{
		const projectPath = process.cwd();
		await Moduless.run(projectPath, coverFunctionName);
		Util.separate();
	}
	
	/** */
	const enum RunGroup
	{
		/** Run all cover functions. */
		all,
		/** Run the assigned cover function. */
		assigned,
		/** Run all cover functions whose name conform to a regular expression. */
		some
	}
	
	//
	setTimeout(() =>
	{
		if (inElectronMain)
			execElectronBootstrapper();
		
		else if (inNode)
			runFromCommandLine();
		
		else if (inBrowser)
		{
			const parsed = parseQueryString();
			
			if (parsed === RunGroup.all)
				run();
				
			else if (parsed === RunGroup.assigned)
				runAssigned();
			
			else
				runAll(parsed);
		}
	});
	
	/** */
	async function execElectronBootstrapper()
	{
		await new Promise<void>(r =>
		{
			(function isReady()
			{
				if (Electron.app && Electron.app.isReady())
					r();
				else
					setTimeout(isReady, 5);
			})();
		});
		
		const [x, y] = PersistentVars.lastWindowPosition;
		const [width, height] = PersistentVars.lastWindowSize;
		
		const window = new Electron.BrowserWindow({
			title: "Moduless",
			acceptFirstMouse: true,
			alwaysOnTop: true,
			enableLargerThanScreen: true,
			x,
			y,
			width,
			height,
			webPreferences: {
				enableRemoteModule: true,
				nodeIntegration: true,
				contextIsolation: false,
				webSecurity: false,
				devTools: true
			}
		});
		
		window.on("moved", () =>
		{
			PersistentVars.lastWindowPosition = window.getPosition();
		});
		
		window.on("resize", () =>
		{
			PersistentVars.lastWindowSize = window.getSize();
		});
		
		// Electron is caching scripts loaded from the debug HTTP server
		// fairly aggressively, so we clear everything here.
		window.webContents.session.clearCache();
		window.webContents.session.clearHostResolverCache();
		
		const indexFile = [
			`<!DOCTYPE html>`,
			`<script src="${__dirname}/moduless.js"></script>`,
		].join("\n");
		
		const indexPath = __dirname + "/index.html";
		Fs.writeFileSync(indexPath, indexFile);
		const url = "file://" + indexPath + composeQueryString();
		await window.webContents.loadURL(url);
	}
	
	const expressionPrefix = "expression=";
	
	/** */
	function composeQueryString()
	{
		if (process.argv.includes("all"))
			return "?all";
		
		const expressionArg = process.argv.find(arg => arg.startsWith(expressionPrefix));
		if (expressionArg)
		{
			const key = expressionPrefix;
			const value = encodeURIComponent(expressionArg.slice(key.length));
			return "?" + key + value;
		}
		
		// Defaults to running the assigned cover function.
		return "";
	}
	
	/**
	 * 
	 */
	function parseQueryString()
	{
		const query = window.location.search;
		
		if (query === "?all")
			return RunGroup.all;
		
		if (query.startsWith("?" + expressionPrefix))
		{
			const regularExpressionEnc = query.slice(expressionPrefix.length + 1);
			const regularExpressionText = decodeURIComponent(regularExpressionEnc);
			return regularExpressionText;
		}
		
		return RunGroup.assigned;
	}
}
