/**
 * Types of Minecraft objects that can be used for storage
 */
export type StorageType =
    import("@minecraft/server").World |
    import("@minecraft/server").Entity |
    import("@minecraft/server").Player |
    import("@minecraft/server").ItemStack;

/**
 * Validator functions for collection fields
 * @template T - The type of objects stored in the collection
 */
export type CollectionValidator<T> = {
    [K in keyof T]?: (value: T[K]) => boolean;
};

/**
 * Direction for sorting results
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort options for query results
 * @template T - The type of objects stored in the collection
 */
export type SortOptions<T> = {
    [K in keyof T]?: SortDirection;
};

/**
 * Available operators for filtering data
 */
export type FilterOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';

/**
 * Condition for filtering data in queries
 * @template T - The type of objects stored in the collection
 */
export type FilterCondition<T> = {
    field: keyof T;
    operator: FilterOperator;
    value: any;
};

/**
 * A lightweight database implementation for Minecraft Bedrock
 * @template T - The type of objects stored in the collection
 */
declare class Database<T> {
    /**
     * Creates a new Database instance
     * @param collectionName - Name of the collection (1-16 characters)
     * @param storageType - Minecraft object to use for storage
     * @param collectionValidators - Optional validation rules for data fields
     * @throws {Error} If collection name length is invalid
     */
    constructor(
        collectionName: string,
        storageType: StorageType,
        collectionValidators?: CollectionValidator<T>
    );

    /**
     * Removes all data from the collection
     * @returns True if successful, false if storage operation failed
     */
    clear(): boolean;

    /**
     * Removes a single item from the collection
     * @param id - Unique identifier of the item
     * @returns True if item was found and deleted, false otherwise
     */
    delete(id: string): boolean;

    /**
     * Creates a new item in the collection
     * @param data - The item to store
     * @returns Generated ID if successful, null if storage operation failed
     * @throws {Error} If data fails validation
     */
    create(data: T): string | null;

    /**
     * Updates an existing item in the collection
     * @param id - Unique identifier of the item
     * @param data - Partial data to update
     * @returns True if item was found and updated, false otherwise
     * @throws {Error} If updated data fails validation
     */
    update(id: string, data: Partial<T>): boolean;

    /**
     * Finds a single item by predicate
     * @param predicate - Function to test each item
     * @returns First matching item or undefined
     */
    findOne(predicate: (value: T) => boolean): { id: string; data: T } | undefined;

    /**
     * Finds an item by its ID
     * @param id - Unique identifier of the item
     * @returns The item if found, undefined otherwise
     */
    findById(id: string): { id: string; data: T } | undefined;

    /**
     * Searches for items with fields containing the search term
     * @param term - Text to search for
     * @param fields - Optional list of fields to search in
     * @returns Array of matching items
     */
    findLike(term: string, fields?: (keyof T)[]): Array<{ id: string; data: T }>;

    /**
     * Retrieves multiple items matching a predicate
     * @param predicate - Optional function to test each item
     * @returns Array of matching items
     */
    findMany(predicate?: (value: T) => boolean): Array<{ id: string; data: T }>;

    /**
     * Creates multiple items in the collection
     * @param items - Array of items to create
     * @returns Array of generated IDs or nulls for failed operations
     */
    createMany(items: T[]): Array<string | null>;

    /**
     * Updates multiple items in the collection
     * @param updates - Array of updates to perform
     * @returns Array of boolean indicating success of each update
     */
    updateMany(updates: Array<{ id: string; data: Partial<T> }>): boolean[];

    /**
     * Deletes multiple items from the collection
     * @param ids - Array of item IDs to delete
     * @returns Array of boolean indicating success of each deletion
     */
    deleteMany(ids: string[]): boolean[];

    /**
     * Queries items using filter conditions and optional sorting/limiting
     * @param conditions - Array of filter conditions
     * @param sort - Optional sorting configuration
     * @param limit - Optional maximum number of results
     * @returns Array of matching items
     */
    query(
        conditions: FilterCondition<T>[],
        sort?: SortOptions<T>,
        limit?: number
    ): Array<{ id: string; data: T }>;

    /**
     * Current number of items in the collection
     */
    get size(): number;

    /**
     * Counts items matching an optional condition
     * @param condition - Optional filter condition
     * @returns Number of matching items
     */
    count(condition?: FilterCondition<T>): number;

    /**
     * Exports all data as a JSON string
     * @returns JSON string containing all data
     */
    export(): string;

    /**
     * Imports data from a JSON string
     * @param data - JSON string containing data to import
     * @returns True if import was successful, false otherwise
     */
    import(data: string): boolean;
}

export default Database;