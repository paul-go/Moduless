
namespace Moduless
{
	/** */
	type CoverReturn = 
		undefined |
		Error | 
		boolean |
		(() => boolean) |
		(() => boolean)[];
	
	/** */
	type CoverFn = () => CoverReturn | Promise<CoverReturn>;
	
	/** */
	type Namespace = Record<string, CoverFn>;
	
	/**
	 * 
	 */
	export async function run(
		cwd = process.cwd(),
		coverFunctionName: string = "")
	{
		if (coverFunctionName === "")
			Util.log("Running all discoverable cover functions.");
		
		const graph = new ProjectGraph(cwd);
		const scriptFilePaths: string[] = [];
		
		for (const project of graph.eachProject())
			if (project.outFile !== "")
				scriptFilePaths.push(project.outFile);
		
		const coverNamespaces: Namespace[] = [];
		const global: any = globalThis;
		
		for (const scriptFilePath of scriptFilePaths)
		{
			if (!Fs.existsSync(scriptFilePath))
			{
				Util.error("File not found: " + scriptFilePath);
				continue;
			}
			
			const requireResult = require(scriptFilePath);
			if (!requireResult || typeof requireResult !== "object")
				continue;
			
			for (const [key, value] of Object.entries(requireResult))
			{
				if (!value || typeof value !== "object")
					continue;
				
				const val = value as Namespace;
				global[key] = value;
				
				if (/^Cover[A-Z]/.test(key))
					coverNamespaces.push(val);
			}
		}
		
		if (coverNamespaces.length === 0)
		{
			Util.error(
				`No namespaces where found that begin with the prefix "Cover".\n` +
				`Be sure you're exporting the namespace like: module.exports = { MyNamespace }; `);
		}
		else
		{
			let hasRunOneFunction = false;
			
			for await (const ns of coverNamespaces)
			{
				const coverResult = await runCovers(ns, coverFunctionName);
				if (coverResult)
				{
					hasRunOneFunction = true;
					
					if (coverFunctionName)
						break;
				}
			}
			
			if (!hasRunOneFunction)
				Util.error("No cover functions were run, because nothing applicable could be found.");
		}
	}
	
	/** */
	async function runCovers(coverNamespace: Namespace, coverFunctionName = "")
	{
		const coverReg = /^cover[A-Z0-9]/;
		const coverPrefix = /^cover/;
		const coverEntries = (() =>
		{
			if (coverFunctionName)
			{
				const coverFunction = coverNamespace[coverFunctionName];
				return typeof coverFunction === "function" ?
					[[coverFunctionName, coverFunction]] as [string, CoverFn][] :
					[];
			}
			
			return Object.entries(coverNamespace);
		})();
		
		if (coverEntries.length === 0)
			return false;
		
		for await (const [coverName, coverFunction] of coverEntries)
		{
			if (typeof coverFunction !== "function")
				continue;
			
			if (!coverReg.test(coverName))
				continue;
			
			const coverFunctionName = coverName.replace(coverPrefix, "");
			let coverResult = coverFunction();
			
			if (coverResult === undefined || coverResult === null)
			{
				report(true, coverFunctionName);
				continue;
			}
			
			if (coverResult instanceof Promise)
				coverResult = await coverResult;
			
			if (coverResult === true)
				report(true, coverFunctionName);
			
			else if (coverResult === false)
				report(false, coverFunctionName);
			
			else if (typeof coverResult === "function")
				execChecker(coverFunctionName, coverResult);
			
			else if (Array.isArray(coverResult))
				for (const checkerFn of coverResult)
					execChecker(coverFunctionName, checkerFn);
		}
		
		return true;
	}
	
	/** */
	function execChecker(coverFunctionName: string, checkerFn: () => boolean)
	{
		const checkerText = checkerFn.toString().replace(/^\s*\(\)\s*=>\s*/, "");
		
		try
		{
			const passed = checkerFn();
			report(passed, coverFunctionName, checkerText);
		}
		catch (e)
		{
			Util.error(
				"Checker function: " + checkerText + " generated an error: \n" +
				"\t" + e.name + ": " + e.message + "\r\n" +
				e.stack || "(no stack trace)");
		}
	}
	
	/** */
	function report(
		passed: boolean,
		coverFunctionName: string,
		checkerFnText: string = "")
	{
		let message = `Cover ${passed ? "passed" : "failed"}: ` + coverFunctionName;
		if (checkerFnText)
			message += ` { ${checkerFnText} }`;
		
		passed ?
			Util.log(message) :
			Util.error(message);
	}
}
