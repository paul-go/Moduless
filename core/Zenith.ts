
namespace Moduless
{
	/**
	 * @internal
	 * Global constant that indicates whether we're running in a browser
	 * (or more specifically, an Electron window).
	 */
	export const inBrowser = 
		typeof window === "object" &&
		String(window.alert) === "function alert() { [native code] }";
	
	/** */
	function runFromCommandLine()
	{
		const cli =  require("cac")() as 
			ReturnType<typeof import("../node_modules/cac/types/index").cac>;
		
		cli
			.command("", "Run the cover function that was set previously.")
			.action(async () =>
			{
				await runAssigned();
			});
		
		cli
			.command("all", "Run all cover functions in series.")
			.action(async () =>
			{
				console.log("Running all discoverable cover functions");
				await run();
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
			.action(location =>
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
				const coverFunctionName = Util.getCoverNameFromLine(specifiedLine);
				
				if (coverFunctionName === "")
				{
					console.error("Could not parse the line: " + specifiedLine);
					return;
				}
				
				Settings.writeSetCoverFunction(coverFilePath, coverFunctionName);
				console.log(`Moduless will now run ${coverFunctionName}() in ${coverFilePath} by default.`);
			});
		
		cli.help();
		cli.parse();
	}
	
	/** */
	async function runAssigned()
	{
		const cwd = process.cwd();
		const coverFunctionName = Settings.readSetCoverFunction(cwd);
		await run(coverFunctionName);
	}
	
	/** */
	async function run(coverFunctionName = "")
	{
		const projectPath = process.cwd();
		await Moduless.run(projectPath, coverFunctionName);
		Util.separate();
	}
	
	//
	setTimeout(() =>
	{
		inBrowser ?
			runAssigned() :
			runFromCommandLine();
	});
}
