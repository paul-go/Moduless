
namespace Name.Space
{
	export function runThisFunction()
	{
		return () => "Success";
	}
}

namespace Cover
{
	/** */
	export function coverAddition()
	{
		return () => 2 + 2 === 4;
	}
	
	/** */
	export function *coverGenerator()
	{
		yield () => 1 + 1 === 2;
		yield () => 2 + 2 === 4;
	}
	
	/** */
	export async function *coverAsyncGenerator()
	{
		yield () => 3 + 3 === 6;
		await new Promise(r => setTimeout(r));
		yield () => 4 + 4 === 8;
	}
	
	/** */
	export function coverExpression1()
	{
		return () => 1 + 1 === 2;
	}
	
	/** */
	export function coverExpression2()
	{
		return () => 2 + 2 === 4;
	}
	
	/** */
	export function modulessReset()
	{
		console.log("Environment reset function run.");
	}
	
	if (typeof module === "object")
		module.exports = { Cover, Name };
}
