import * as mc from "@minecraft/server";

export type StorageType = mc.World | mc.Entity | mc.Player | mc.ItemStack;
export type CollectionValidator<T> = { [K in keyof T]?: (value: T[K]) => boolean };
export type SortDirection = 'asc' | 'desc';
export type SortOptions<T> = { [K in keyof T]?: SortDirection };
export type FilterOperator = '==' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
export type FilterCondition<T> = {
    field: keyof T;
    operator: FilterOperator;
    value: any;
}

export default class Database<T> {
    private data: Map<string, T>;

    constructor(
        private collectionName: string,
        private storageType: StorageType,
        private collectionValidators?: CollectionValidator<T>
    ) {
        if (collectionName.length < 1 || collectionName.length > 16)
            throw new Error("Collection name must be between 1 and 16 characters");
        this.data = new Map<string, T>();
        this.initialize();
    }

    private initialize() {
        try {
            const storedData = this.storageType.getDynamicProperty(this.collectionName) as string;
            if (storedData) {
                const entries = JSON.parse(storedData);
                for (const [id, data] of entries) {
                    if (this.validate(data)) {
                        this.data.set(id, data);
                    } else {
                        console.error(`Invalid data found during initialization for id: ${id}`);
                    }
                }
            }
        } catch (error) {
            console.error("Error reading from storage:", error);
            this.clear();
            this.saveChanges();
        }
    }

    private saveChanges(): boolean {
        try {
            const entries = Array.from(this.data.entries());
            this.storageType.setDynamicProperty(this.collectionName, JSON.stringify(entries));
            return true;
        } catch (error) {
            console.error("Error saving to storage:", error);
            return false;
        }
    }

    private generateId(): string {
        let id: string;
        do {
            id = Array.from(
                { length: 16 },
                () => Math.floor(Math.random() * 16).toString(16)
            ).join('');
        } while (this.data.has(id));
        return id;
    }

    private validate(data: T): boolean {
        if (!this.collectionValidators) return true;

        return Object.entries(this.collectionValidators).every(([key, validator]: [string, (value: any) => boolean]) => {
            if (!validator) return true;
            return validator(data[key as keyof T]);
        });
    }

    private evaluateCondition(data: T, condition: FilterCondition<T>): boolean {
        const value = data[condition.field];
        const conditionValue = condition.value;

        switch (condition.operator) {
            case '==': return value === conditionValue;
            case '!=': return value !== conditionValue;
            case '>': return value > conditionValue;
            case '<': return value < conditionValue;
            case '>=': return value >= conditionValue;
            case '<=': return value <= conditionValue;
            case 'contains':
                return String(value).toLowerCase().includes(String(conditionValue).toLowerCase());
            case 'startsWith':
                return String(value).toLowerCase().startsWith(String(conditionValue).toLowerCase());
            case 'endsWith':
                return String(value).toLowerCase().endsWith(String(conditionValue).toLowerCase());
            default:
                return false;
        }
    }

    public clear(): boolean {
        this.data.clear();
        return this.saveChanges();
    }

    public delete(id: string): boolean {
        if (!this.data.has(id)) return false;

        this.data.delete(id);
        if (!this.saveChanges()) {
            return false;
        }
        return true;
    }

    public create(data: T): string | null {
        if (!this.validate(data)) {
            throw new Error("Invalid data format");
        }

        const id = this.generateId();
        this.data.set(id, data);

        if (!this.saveChanges()) {
            this.data.delete(id);
            return null;
        }

        return id;
    }

    public update(id: string, data: Partial<T>): boolean {
        const existingData = this.data.get(id);
        if (!existingData) return false;

        const updatedData = { ...existingData, ...data } as T;
        if (!this.validate(updatedData)) {
            throw new Error("Invalid data format");
        }

        const originalData = this.data.get(id);
        this.data.set(id, updatedData);

        if (!this.saveChanges() && originalData) {
            this.data.set(id, originalData);
            return false;
        }

        return true;
    }

    public findOne(predicate: (value: T) => boolean): { id: string; data: T } | undefined {
        return this.findMany(predicate)[0];
    }

    public findById(id: string): { id: string; data: T } | undefined {
        const data = this.data.get(id);
        return data ? { id, data } : undefined;
    }

    public findLike(term: string, fields?: (keyof T)[]): Array<{ id: string; data: T }> {
        const lowerCaseTerm = term.toLowerCase();
        return Array.from(this.data.entries())
            .filter(([_, data]) => {
                const searchFields = fields || Object.keys(data);
                return searchFields.some(field => {
                    try {
                        return String(data[field as keyof T]).toLowerCase().includes(lowerCaseTerm);
                    } catch {
                        return false;
                    }
                });
            })
            .map(([id, data]) => ({ id, data }));
    }

    public findMany(predicate?: (value: T) => boolean): Array<{ id: string; data: T }> {
        if (predicate) {
            return Array.from(this.data.entries())
                .filter(([_, data]) => predicate(data))
                .map(([id, data]) => ({ id, data }));
        } else {
            return Array.from(this.data.entries())
                .map(([id, data]) => ({ id, data }));
        }
    }

    public createMany(items: T[]): Array<string | null> {
        return items.map(item => this.create(item));
    }

    public updateMany(updates: Array<{ id: string; data: Partial<T> }>): boolean[] {
        return updates.map(({ id, data }) => this.update(id, data));
    }

    public deleteMany(ids: string[]): boolean[] {
        return ids.map(id => this.delete(id));
    }

    public query(conditions: FilterCondition<T>[], sort?: SortOptions<T>, limit?: number): Array<{ id: string; data: T }> {
        let results = Array.from(this.data.entries())
            .filter(([_, data]) =>
                conditions.every(condition => this.evaluateCondition(data, condition))
            );

        if (sort) {
            const sortEntries = Object.entries(sort);
            results.sort(([_aId, a], [_bId, b]) => {
                for (const [field, direction] of sortEntries) {
                    const aVal = a[field as keyof T];
                    const bVal = b[field as keyof T];
                    if (aVal === bVal) continue;

                    const comparison = aVal < bVal ? -1 : 1;
                    return direction === 'asc' ? comparison : -comparison;
                }
                return 0;
            });
        }

        if (limit !== undefined) {
            results = results.slice(0, limit);
        }

        return results.map(([id, data]) => ({ id, data }));
    }

    public get size(): number {
        return this.data.size;
    }

    public count(condition?: FilterCondition<T>): number {
        if (!condition) return this.size;

        return Array.from(this.data.values())
            .filter(data => this.evaluateCondition(data, condition))
            .length;
    }

    public export(): string {
        return JSON.stringify(Array.from(this.data.entries()));
    }

    public import(data: string): boolean {
        try {
            const entries = JSON.parse(data);
            const validEntries = entries.filter(([_, value]: [string, T]) => this.validate(value));

            if (validEntries.length !== entries.length) {
                console.warn("Some entries were invalid and were skipped during import");
            }

            this.clear();
            for (const [id, value] of validEntries) {
                this.data.set(id, value);
            }

            return this.saveChanges();
        } catch (error) {
            console.error("Error during import:", error);
            return false;
        }
    }
}