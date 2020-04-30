
namespace Moduless
{
	setTimeout(() =>
	{
		Cli
			.command("", "Run the cover function that was set previously.")
			.action(async () =>
			{
				const cwd = process.cwd();
				const coverFunctionName = Settings.readSetCoverFunction(cwd);
				await run(coverFunctionName);
			});
		
		Cli
			.command("run", "Run all cover functions in series.")
			.action(async () =>
			{
				await run();
			});
		
		Cli
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
				
				Settings.writeSetCoverFunction(coverFilePath, coverFunctionName);
				console.log(`Moduless will now run ${coverFunctionName}() in ${coverFilePath} by default.`);
			});
		
		
		Cli.help();
		Cli.parse();
	});
	
	/** */
	async function run(coverFunctionName = "")
	{
		const projectPath = process.cwd();
		await Moduless.run(projectPath, coverFunctionName);
		Util.separate();
	}
}
