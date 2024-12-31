export default class Database extends Map {
    collectionName;
    storageType;
    collectionValidators;
    constructor(collectionName, storageType, collectionValidators) {
        super();
        this.collectionName = collectionName;
        this.storageType = storageType;
        this.collectionValidators = collectionValidators;
        if (collectionName.length < 1 || collectionName.length > 16)
            throw new Error("Collection name must be between 1 and 16 characters");
        this.initialize();
    }
    initialize() {
        try {
            const storedData = this.storageType.getDynamicProperty(this.collectionName);
            if (storedData) {
                JSON.parse(storedData).forEach(([id, data]) => super.set(id, data));
            }
        }
        catch (error) {
            console.error("Error reading from storage:", error);
            this.clear();
            this.saveChanges();
        }
    }
    saveChanges() {
        try {
            const entries = Array.from(this.entries());
            this.storageType.setDynamicProperty(this.collectionName, JSON.stringify(entries));
        }
        catch (error) {
            console.error("Error saving to storage:", error);
        }
    }
    generateId() {
        return Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
    validate(data) {
        if (!this.collectionValidators)
            return true;
        return Object.entries(this.collectionValidators).every(([key, validator]) => {
            if (!validator)
                return true;
            return validator(data[key]);
        });
    }
    evaluateCondition(data, condition) {
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
    clear() {
        super.clear();
        this.saveChanges();
    }
    set(id, value) {
        if (!this.validate(value)) {
            throw new Error("Invalid data format");
        }
        super.set(id, value);
        this.saveChanges();
        return this;
    }
    delete(id) {
        const result = super.delete(id);
        if (result) {
            this.saveChanges();
        }
        return result;
    }
    create(data) {
        if (!this.validate(data)) {
            throw new Error("Invalid data format");
        }
        const id = this.generateId();
        this.set(id, data);
        return id;
    }
    update(id, data) {
        const existingData = this.get(id);
        if (!existingData)
            return false;
        const updatedData = { ...existingData, ...data };
        if (!this.validate(updatedData)) {
            throw new Error("Invalid data format");
        }
        this.set(id, updatedData);
        return true;
    }
    findOne(predicate) {
        return this.findMany(predicate)[0];
    }
    findLike(term, fields) {
        const lowerCaseTerm = term.toLowerCase();
        return Array.from(this.entries())
            .filter(([_, data]) => {
            const searchFields = fields || Object.keys(data);
            return searchFields.some(field => {
                try {
                    return String(data[field]).toLowerCase().includes(lowerCaseTerm);
                }
                catch {
                    return false;
                }
            });
        })
            .map(([id, data]) => ({ id, data }));
    }
    findMany(predicate) {
        if (predicate) {
            return Array.from(this.entries())
                .filter(([_, data]) => predicate(data))
                .map(([id, data]) => ({ id, data }));
        }
        else {
            return Array.from(this.entries())
                .map(([id, data]) => ({ id, data }));
        }
    }
    createMany(items) {
        return items.map(item => this.create(item));
    }
    updateMany(updates) {
        return updates.map(({ id, data }) => this.update(id, data));
    }
    deleteMany(ids) {
        return ids.map(id => this.delete(id));
    }
    query(conditions, sort, limit) {
        let results = Array.from(this.entries())
            .filter(([_, data]) => conditions.every(condition => this.evaluateCondition(data, condition)));
        if (sort) {
            const sortEntries = Object.entries(sort);
            results.sort(([_aId, a], [_bId, b]) => {
                for (const [field, direction] of sortEntries) {
                    const aVal = a[field];
                    const bVal = b[field];
                    if (aVal === bVal)
                        continue;
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
    count(condition) {
        if (!condition)
            return this.size;
        return Array.from(this.values())
            .filter(data => this.evaluateCondition(data, condition))
            .length;
    }
    export() {
        return JSON.stringify(Array.from(this.entries()));
    }
    import(data) {
        this.clear();
        JSON.parse(data).forEach(([id, value]) => {
            this.set(id, value);
        });
    }
}
