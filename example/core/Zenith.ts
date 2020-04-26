
namespace Example
{
	/**
	 * Example function that just creates a Truth Program object.
	 */
	export function createProgram()
	{
		return new Truth.Program();
	}
	
	if (typeof module === "object")
		module.exports = { Example };
}
