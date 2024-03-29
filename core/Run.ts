
namespace Moduless
{
	/** */
	type CoverReturn = 
		undefined |
		Error | 
		boolean |
		Element |
		(() => boolean) |
		(() => boolean)[];
	
	/** */
	type CoverFn = () => CoverReturn | Promise<CoverReturn>;
	
	/**
	 * An interface that stores information about the running
	 * of a single cover function.
	 */
	export interface IRunMeta
	{
		functionNamespace: string[];
		functionName: string;
		projectPath: string;
		
		/**
		 * Whether the "name" property refers to a prefix (true),
		 * or whether it's a fully qualified name (false).
		 */
		prefix?: boolean;
	}
	
	/**
	 * 
	 */
	export async function run(runInfo: IRunMeta)
	{
		// Wait 1600ms to give the debugger a chance to connect.
		// This can be a problem with larger projects when 
		if (Moduless.inElectronMain || Moduless.inElectronRender)
			await new Promise(r => setTimeout(r, 1600));
		
		if (Moduless.inElectronRender)
		{
			// Eliminate Electron's console generated garbage
			console.clear();
		}
		
		if (runInfo.prefix)
		{
			Util.log(
				`Running cover functions in ${runInfo.functionNamespace.join(".")} ` +
				`starting with ${runInfo.functionName}.`);
		}
		
		let hasRunOneFunction = false;
		
		const coverResult = await runCovers(runInfo);
		if (coverResult)
		{
			hasRunOneFunction = true;
			
			if (runInfo.functionName)
				return;
		}
		
		if (!hasRunOneFunction)
			Util.error("No cover functions were run, because nothing applicable could be found.");
	}
	
	/**
	 * Scans the entire project graph, calls require() on each
	 * outFile defined in each project, and returns an array of
	 * objects containing the the Project objects and the export
	 * value acquired from the require() call.
	 */
	function getGraphFromDependencies(projectPath: string)
	{
		const graph = new ProjectGraph(projectPath);
		const out: { project: Project; exported: object; }[] = [];
		
		for (const project of graph.eachProject())
		{
			if (!Fs.existsSync(project.outFile))
			{
				Util.error("File not found: " + project.outFile);
				continue;
			}
			
			try
			{
				const ex = require(project.outFile);
				if (ex && typeof ex !== "undefined" && !Array.isArray(ex))
					out.push({ project, exported: ex });
				
				const g = globalThis as any;
				
				// Globalize the exports of the project.
				for (const [name, value] of Object.entries(ex))
				{
					if (!(name in g))
						g[name] = value;
					
					else if (g[name]?.constructor === Object)
						Object.assign(g[name], value);
					
					else
						console.warn(
							`Skipping adding ${name} from ${project.projectPath} to global scope ` +
							`because another member with this name is already defined globally.`);
				}
			}
			catch (e)
			{
				console.log(e);
			}
		}
		
		return out;
	}
	
	/**
	 * Runs the cover functions with the specified name, from the specified
	 * namespace. Intended for use with Node.js.
	 */
	async function runCovers(target: IRunMeta)
	{
		const ns = target.functionNamespace.join(".");
		const graph = getGraphFromDependencies(target.projectPath);
		const startingProject = graph.at(-1);
		
		if (!startingProject)
			throw new Error("No projects found at location: " + target.projectPath);
		
		// Starts an HTTP server that serves the outFiles loaded 
		// from the discovered set of projects.
		{
			const projects = graph.map(entry => entry.project);
			const outFiles = projects.map(p => p.outFile);
			let charIndex = 0;
			for (;;)
			{
				if (outFiles.some(f => f.length <= charIndex))
					break;
				
				if (!outFiles.every(f => f[charIndex] === outFiles[0][charIndex]))
					break;
				
				charIndex++;
			}
			
			const path = outFiles[0].slice(0, charIndex);
			const runJs = ns + "." + target.functionName + "()";
			const runScript = `<script>setTimeout(() => ${runJs})</script>`;
			
			Moduless.createServer({
				path,
				route: path =>
				{
					if (path === "/")
					{
						const now = Date.now();
						return [
							"<!DOCTYPE html>",
							`<meta charset="UTF-8">`,
							`<meta name="apple-mobile-web-app-capable" content="yes">`,
							`<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`,
							`<meta name="apple-mobile-web-app-title" content="Moduless">`,
							`<meta name="viewport" content="initial-scale=1, minimum-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width">`,
							...outFiles.map(f => `<script src="${f.slice(charIndex)}?${now}"></script>`),
							runScript
						].join("\n");
					}
				}
			});
			
			console.log("HTTP server is available at: http://localhost:" + Moduless.defaultHttpPort);
		}
		
		const tryResolveNamepace = (root: object) =>
		{
			let current: any = root;
			
			for (const identifier of target.functionNamespace)
			{
				if (!(identifier in current))
					return null;
				
				current = current[identifier];
			}
			
			return current;
		};
		
		const namespaceObject =
			tryResolveNamepace(startingProject.exported) ||
			globalThis;
		
		const covers = (() =>
		{
			const out: [string, CoverFn][] = [];
			
			if (target.functionName)
			{
				const fn = namespaceObject[target.functionName];
				
				if (typeof fn !== "function")
					throw new Error(`${ns}.${target.functionName} is not a function.`);
				
				out.push([target.functionName, fn]);
			}
			else if (target.prefix)
				for (const [functionName, maybeFunction] of Object.entries(namespaceObject))
					if (typeof maybeFunction === "function")
						if (functionName.startsWith(target.functionName))
							out.push([functionName, maybeFunction as any]);
			
			return out;
		})();
		
		if (covers.length === 0)
			return false;
		
		for (const [coverName, coverFunction] of covers)
			await runSingleCover(coverName, coverFunction);
		
		return true;
	}
	
	/**
	 * Returns the name of the cover function currently being tested.
	 */
	export function getRunningFunctionName()
	{
		return runningFunctionName;
	}
	let runningFunctionName = "";
	
	/** */
	export async function runSingleCover(
		coverName: string,
		coverFunction: CoverFn)
	{
		if (typeof coverFunction !== "function")
			return;
		
		runningFunctionName = coverName;
		let coverResult = coverFunction();
		
		if (coverResult === undefined || coverResult === null)
		{
			report(true, coverName);
			return;
		}
		
		if (coverResult instanceof Promise)
			coverResult = await coverResult;
		
		if (Moduless.inBrowser && coverResult)
		{
			if (coverResult instanceof window.Element)
				document.body.appendChild(coverResult);
			
			else if (Array.isArray(coverResult))
			{
				for (let i = coverResult.length; i-- > 0;)
				{
					const element = coverResult[i];
					if (element instanceof window.Element)
					{
						document.body.prepend(element);
						coverResult.splice(i, 1);
					}
				}
			}
		}
		
		if (coverResult === true)
			report(true, coverName);
		
		else if (coverResult === false)
			report(false, coverName);
		
		else if (typeof coverResult === "function")
			execChecker(coverName, coverResult);
		
		else if (Array.isArray(coverResult) || isGenerator(coverResult))
			for (const checkerFn of coverResult)
				execChecker(coverName, checkerFn);
		
		else if (isAsyncGenerator(coverResult))
			for await (const checkerFn of coverResult)
				await execCheckerAsync(coverName, checkerFn);
	}
	
	/** */
	function isGenerator(coverResult: any): coverResult is IterableIterator<any>
	{
		return !!coverResult &&
			typeof coverResult === "object" &&
			coverResult[Symbol.toStringTag] === "Generator" &&
			typeof coverResult[Symbol.iterator] === "function";
	}
	
	/** */
	function isAsyncGenerator(coverResult: any): coverResult is AsyncIterableIterator<any>
	{
		return !!coverResult &&
			typeof coverResult === "object" &&
			//coverResult[Symbol.toStringTag] === "AsyncGenerator" &&
			typeof coverResult[Symbol.asyncIterator] === "function";
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
		catch (err)
		{
			const e = err as Error;
			Util.error(
				"Checker function: " + checkerText + " generated an error: \n" +
				"\t" + e.name + ": " + e.message + "\r\n" +
				e.stack || "(no stack trace)");
		}
	}
	
	/** */
	async function execCheckerAsync(coverFunctionName: string, checkerFn: () => Promise<boolean>)
	{
		const checkerText = checkerFn.toString().replace(/^\s*\(\)\s*=>\s*/, "");
		
		try
		{
			const passed = await checkerFn();
			report(passed, coverFunctionName, checkerText);
		}
		catch (err)
		{
			const e = err as Error;
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
