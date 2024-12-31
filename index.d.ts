/**
 * @fileoverview
 * Type definitions for mclab.database
 * See https://github.com/sausage404/mclab.database for more details.
 *
 * @license MIT
 *
 * @author [sausage404] <parinya24dev@gmail.com>
 *
 * This file contains type definitions for the mclab.database JavaScript library.
 * It provides TypeScript types for the library's public API.
 * 
 * To use these types, include this file in your TypeScript project and ensure
 * your TypeScript compiler is configured to recognize `.d.ts` files.
 */

declare module "@minecraft/server";

/** Storage types that can be used with the Database class */
type StorageType = import("@minecraft/server").World | import("@minecraft/server").Entity | import("@minecraft/server").Player | import("@minecraft/server").ItemStack;

/** 
 * Validator functions for collection fields
 * @template T - The type of the collection items
 */
export type CollectionValidator<T> = { [K in keyof T]?: (value: T[K]) => boolean };

/** Sort direction for query results */
export type SortDirection = 'asc' | 'desc';

/** 
 * Sort options for query operations
 * @template T - The type of the collection items
 */
export type SortOptions<T> = { [K in keyof T]?: SortDirection };

/** Available filter operators for query conditions */
export type FilterOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';

/** 
 * Filter condition for query operations
 * @template T - The type of the collection items
 */
export type FilterCondition<T> = {
    /** Field to filter on */
    field: keyof T;
    /** Operator to use for comparison */
    operator: FilterOperator;
    /** Value to compare against */
    value: any;
}

/**
 * A key-value database implementation with support for validation, querying, and persistence
 * @template T - The type of items stored in the database. Must not include an 'id' field
 */
declare class Database<T> extends Map<string, T> {
    /**
     * Creates a new Database instance
     * @param collectionName - Name of the collection (1-16 characters)
     * @param storageType - Storage backend to use (World, Entity, Player, or ItemStack)
     * @param collectionValidators - Optional validators for collection fields
     */
    constructor(
        collectionName: string,
        storageType: StorageType,
        collectionValidators?: CollectionValidator<T>
    );

    /** Removes all items from the database */
    clear(): void;

    /**
     * Sets a value in the database
     * @param id - Unique identifier for the item
     * @param value - Item data
     * @returns The database instance
     * @throws Error if the data fails validation
     */
    set(id: string, value: T): this;

    /**
     * Removes an item from the database
     * @param id - Unique identifier of the item to remove
     * @returns True if an item was removed, false otherwise
     */
    delete(id: string): boolean;

    /**
     * Creates a new item in the database
     * @param data - The item data
     * @returns Generated unique identifier for the new item
     * @throws Error if the data fails validation
     */
    create(data: T): string;

    /**
     * Updates an existing item in the database
     * @param id - Unique identifier of the item to update
     * @param data - Partial data to update
     * @returns True if the item was updated, false if not found
     * @throws Error if the resulting data fails validation
     */
    update(id: string, data: Partial<T>): boolean;

    /**
     * Finds the first item matching the predicate
     * @param predicate - Function to test each item
     * @returns The matching item and its ID, or undefined if not found
     */
    findOne(predicate: (value: T) => boolean): { id: string; data: T } | undefined;

    /**
     * Searches for items containing a string in specified fields
     * @param term - Search term
     * @param fields - Optional fields to search in (defaults to all fields)
     * @returns Array of matching items with their IDs
     */
    findLike(term: string, fields?: (keyof T)[]): Array<{ id: string; data: T }>;

    /**
     * Finds all items matching a predicate
     * @param predicate - Optional function to test each item
     * @returns Array of matching items with their IDs
     */
    findMany(predicate?: (value: T) => boolean): Array<{ id: string; data: T }>;

    /**
     * Creates multiple items in the database
     * @param items - Array of items to create
     * @returns Array of generated unique identifiers
     * @throws Error if any item fails validation
     */
    createMany(items: T[]): string[];

    /**
     * Updates multiple items in the database
     * @param updates - Array of updates with IDs and partial data
     * @returns Array of boolean values indicating success of each update
     */
    updateMany(updates: Array<{ id: string; data: Partial<T> }>): boolean[];

    /**
     * Deletes multiple items from the database
     * @param ids - Array of item IDs to delete
     * @returns Array of boolean values indicating success of each deletion
     */
    deleteMany(ids: string[]): boolean[];

    /**
     * Queries the database with complex conditions and sorting
     * @param conditions - Array of filter conditions
     * @param sort - Optional sort configuration
     * @param limit - Optional maximum number of results
     * @returns Array of matching items with their IDs
     */
    query(
        conditions: FilterCondition<T>[],
        sort?: SortOptions<T>,
        limit?: number
    ): Array<{ id: string; data: T }>;

    /**
     * Counts items matching a condition
     * @param condition - Optional filter condition
     * @returns Number of matching items
     */
    count(condition?: FilterCondition<T>): number;

    /**
     * Exports the database contents as a JSON string
     * @returns JSON string representation of the database
     */
    export(): string;

    /**
     * Imports data from a JSON string
     * @param data - JSON string containing database data
     * @throws Error if the data format is invalid
     */
    import(data: string): void;
}

export default Database;