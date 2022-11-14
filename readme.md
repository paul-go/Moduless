
# Moduless

A lightweight function runner that supports module-free workflow. Designed for use with Visual Studio Code.

## How to use

Step 1: Install moduless into your project:
```
npm install moduless --save-dev
```

Step 2: Create a Visual Studio Code task that will allow you to easily set an active function to run. In your `.code-workspace` file, merge in the following JSON:

```json
{
	"tasks": {
		"tasks": [
			{
				"label": "Set Active Cover Function",
				"type": "shell",
				"command": "npx",
				"args": [
					"moduless",
					"set",
					"${file}:${lineNumber}"
				],
				"problemMatcher": []
			},
		]
	}
}
```
It's highly recommended that you assign a Hotkey to this task. When using the moduless workflow, you'll be running this task _constantly_.
