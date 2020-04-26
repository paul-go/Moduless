
namespace Moduless
{
	setTimeout(() =>
	{
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
				let [coverFilePath, lineText] = location.split(":");
				let lineIdx = 0;
				if (!lineText || !(lineIdx = parseInt(lineText, 10)) || lineIdx < 1)
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
		
		Cli
			.command("run-set", "Run the cover function that was set previously.")
			.action(async () =>
			{
				const { coverFilePath, coverFunctionName } = Settings.readSetCoverFunction();
				await run(coverFunctionName);
			});
		
		Cli.help();
		Cli.parse();
	});
	
	/** */
	async function run(coverFunctionName = "")
	{
		const projectPath = Path.join(process.cwd(), "example");
		await Moduless.run(projectPath, coverFunctionName);
		Util.separate();
	}
}
