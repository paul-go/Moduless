
namespace Moduless
{
	/** */
	function runFromCommandLine()
	{
		const cli = require("cac")();
		
		cli
			.command("", "Run the cover function that has been marked as active.")
			.action(async () =>
			{
				await runActive();
			});
		
		cli
			.command("all <prefix>", 
				"Run many cover functions in series, optionally filtering by those " +
				"whose function names start with the specified prefix, which may " + 
				"contain a namespace, for example Name.Space.fnPrefix")
			.action(async (prefix: string) =>
			{
				await runAll(prefix || "");
			});
		
		cli
			.command("call <function_name>", "Run a specific cover function by name.")
			.action(async (function_name: string) =>
			{
				console.log("Running cover function: " + function_name);
				await run(function_name);
			});
		
		cli
			.command(
				"set <location>", 
				"Set a line within a source file to start running (/path/to/file.ts:123)")
			.action((location: string) =>
			{
				let [functionFilePath, lineNumText] = location.split(":");
				let lineIdx = 0;
				if (!lineNumText || !(lineIdx = parseInt(lineNumText, 10)) || lineIdx < 1)
					return Util.error("Input is expected to be in the form: /path/to/file.ts:123");
				
				functionFilePath = Path.resolve(functionFilePath);
				if (!Fs.existsSync(functionFilePath))
					return Util.error("Code file does not exist: " + functionFilePath);
				
				const codeFileText = Fs.readFileSync(functionFilePath).toString("utf8");
				const codeFileLines = codeFileText.split("\n");
				const specifiedLine = codeFileLines[lineIdx - 1];
				const functionName = Util.getFunctionNameFromLine(specifiedLine);
				const namespaceLines = codeFileLines.slice(0, lineIdx);
				const namespace = Util.getContainingNamespaceName(namespaceLines);
				const qualifiedName = functionName;
				
				if (functionName === "")
				{
					console.error("Could not parse the line: " + specifiedLine);
					return;
				}
				
				Settings.writeActiveFunction(
					functionFilePath,
					namespace,
					qualifiedName);
				
				console.log(`Moduless will now run ${qualifiedName}() in ${functionFilePath} by default.`);
			});
		
		cli.help();
		cli.parse();
	}
	
	/** */
	async function runActive()
	{
		const cwd = process.cwd();
		const active = Settings.readActiveFunction(cwd);
		if (!active)
		{
			console.error("No active cover function has been set.");
			return;
		}
		
		await Moduless.run(active);
		Util.separate();
	}
	
	/** */
	async function runAll(prefix: string)
	{
		if (1) throw new Error("Not implemented");
		
		console.log("Running functions that start with: " + prefix);
		await Moduless.run({} as any);
		Util.separate();
	}
	
	/** */
	async function run(qualifiedName: string)
	{
		if (1) throw new Error("Not implemented");
		
		await Moduless.run({} as any);
		Util.separate();
	}
	
	/** */
	const enum RunGroup
	{
		/** Run all cover functions. */
		all,
		/** Run the active cover function. */
		active,
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
			{
				throw "Not implemented";
				run("");
			}
				
			else if (parsed === RunGroup.active)
				runActive();
			
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
		
		Electron.contextBridge.exposeInMainWorld("electron", { require });
		
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
		
		// Defaults to running the target cover function.
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
		
		return RunGroup.active;
	}
}
