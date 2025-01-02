# Database Management for Minecraft Bedrock deverlopment

[![npm version](https://badge.fury.io/js/%40mbext%2Fdatabase.svg)](https://www.npmjs.com/package/@mbext/database)

@mbext/database is a lightweight and flexible database solution for Minecraft Bedrock Edition (MCBE) add-ons. It provides a simple API for creating, reading, updating, and deleting data within your MCBE scripts.

## Features

- Dynamic property-based storage system
- Type-safe operations with TypeScript generics
- Case-insensitive search capabilities
- Complex filtering conditions (==, !=, >, <, >=, <=, contains, startsWith, endsWith)
- Customizable collection names
- Automatic ID generation
- Memory-efficient storage using JSON serialization

## Installation

To install @mbext/database in your MCBE add-on project, you have two options:

### Option 1: Install via npm

1. Open a terminal and navigate to your project's root directory.
2. Run the following command to install the package:

```bash
npm i @mbext/database
```

3. Use the module with [ESBuild](https://jaylydev.github.io/posts/bundle-minecraft-scripts-esbuild/) or [Webpack](https://jaylydev.github.io/posts/scripts-bundle-minecraft/)

### Option 2: Clone the repository

1. Open a terminal and navigate to your project's root directory.
2. Run the following command to clone the repository:

```bash
git clone https://github.com/sausage404/mbext-database.git
```

3. Copy the `index.ts` and `index.d.ts` or `index.js` file from the cloned repository into your project's scripts folder.

## Basic Usage

Let's walk through how to use the database in your minecraft bedrock. We'll cover the essential operations with practical examples.

Create a Database Instance With TypeScript

```typescript
import * as mc from "@minecraft/server";
import Database, { CollectionValidator } from "@mbext/database";

// Define the structure of your data
interface User {
    id: string;
    name: string;
    age: number;
    money: number;
}

const validateUser: CollectionValidator<User>  = {
    id: (value) => value.length > 0,
    name: (value) => value.length > 0,
    age: (value) => value > 0,
    money: (value) => value >= 0
}

// Initialize the database
const database = new Database<User>("users", mc.world, validateUser);

// Create a new user
const newUser: User = {
    id: "user123",
    name: "John Doe",
    age: 30,
    money: 1000,
};

// Insert the new user into the database
database.create(newUser);

// Read all users from the database
const users = database.findMany().forEach((user) => {
    console.log(user);
});
```

## License

This project is licensed under a custom license. The key points of this license are:

1. You may use this software for both personal and commercial purposes.
2. Redistribution is allowed, but you must include this license and the copyright notice.
3. Modification or creation of derivative works is prohibited without explicit permission from the copyright holder.
4. You may not sublicense, sell, lease, or rent this software.
5. Attribution to the original author (sausage404) is required in projects or products using this software.
6. Reverse engineering is prohibited unless explicitly authorized by law.

For the full license text, please see the [LICENSE](./LICENSE) file in this repository.

## Issues

If you encounter any problems or have suggestions, please file an issue on the GitHub repository.