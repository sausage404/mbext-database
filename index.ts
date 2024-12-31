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

export default class Database<T> extends Map<string, T> {
    constructor(
        private collectionName: string,
        private storageType: StorageType,
        private collectionValidators?: CollectionValidator<T>
    ) {
        super();
        if (collectionName.length < 1 || collectionName.length > 16)
            throw new Error("Collection name must be between 1 and 16 characters");
        this.initialize();
    }

    private initialize() {
        try {
            const storedData = this.storageType.getDynamicProperty(this.collectionName) as string;
            if (storedData) {
                JSON.parse(storedData).forEach(([id, data]: [string, T]) => super.set(id, data));
            }
        } catch (error) {
            console.error("Error reading from storage:", error);
            this.clear();
            this.saveChanges();
        }
    }

    private saveChanges() {
        try {
            const entries = Array.from(this.entries());
            this.storageType.setDynamicProperty(this.collectionName, JSON.stringify(entries));
        } catch (error) {
            console.error("Error saving to storage:", error);
        }
    }

    private generateId(): string {
        return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
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

    public clear(): void {
        super.clear();
        this.saveChanges();
    }

    public set(id: string, value: T): this {
        if (!this.validate(value)) {
            throw new Error("Invalid data format");
        }
        super.set(id, value);
        this.saveChanges();
        return this;
    }

    public delete(id: string): boolean {
        const result = super.delete(id);
        if (result) {
            this.saveChanges();
        }
        return result;
    }

    public create(data: T): string {
        if (!this.validate(data)) {
            throw new Error("Invalid data format");
        }

        const id = this.generateId();
        this.set(id, data);
        return id;
    }

    public update(id: string, data: Partial<T>): boolean {
        const existingData = this.get(id);
        if (!existingData) return false;

        const updatedData = { ...existingData, ...data } as T;
        if (!this.validate(updatedData)) {
            throw new Error("Invalid data format");
        }

        this.set(id, updatedData);
        return true;
    }

    public findOne(predicate: (value: T) => boolean): { id: string; data: T } | undefined {
        return this.findMany(predicate)[0];
    }

    public findLike(term: string, fields?: (keyof T)[]): Array<{ id: string; data: T }> {
        const lowerCaseTerm = term.toLowerCase();
        return Array.from(this.entries())
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
            return Array.from(this.entries())
                .filter(([_, data]) => predicate(data))
                .map(([id, data]) => ({ id, data }));
        } else {
            return Array.from(this.entries())
                .map(([id, data]) => ({ id, data }));
        }
    }

    public createMany(items: T[]): string[] {
        return items.map(item => this.create(item));
    }

    public updateMany(updates: Array<{ id: string; data: Partial<T> }>): boolean[] {
        return updates.map(({ id, data }) => this.update(id, data));
    }

    public deleteMany(ids: string[]): boolean[] {
        return ids.map(id => this.delete(id));
    }

    public query(conditions: FilterCondition<T>[], sort?: SortOptions<T>, limit?: number): Array<{ id: string; data: T }> {
        let results = Array.from(this.entries())
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

    public count(condition?: FilterCondition<T>): number {
        if (!condition) return this.size;

        return Array.from(this.values())
            .filter(data => this.evaluateCondition(data, condition))
            .length;
    }

    public export(): string {
        return JSON.stringify(Array.from(this.entries()));
    }

    public import(data: string): void {
        this.clear();
        JSON.parse(data).forEach(([id, value]: [string, T]) => {
            this.set(id, value);
        });
    }
}
