(function () {
    'use strict';

    class ElementGenerator {
        tagName;
        clasName;
        options;
        constructor(tagName, clasName, options) {
            this.clasName = clasName;
            this.options = options;
            this.el = document.createElement(tagName);

        }

        render() {
            if (this.clasName) {
                this.clasName.split(" ").forEach(cls => cls && this.el.classList.add(cls));
            }
            if (this.options) {
                Object.keys(this.options).forEach(prop => {
                    this.el[prop] = this.options[prop];
                });
            }
            return this.el;
        }
    }

    class View {

        constructor(needLayout = true) {
            this.app = document.querySelector("#root");
            if (needLayout) {

                const layout = this.initLayot();
                this.app.append(layout);
                this.app = layout;

            }
        }

        setTitle(title) {
            document.title = title;
        }

        initLayot() {
            return new ElementGenerator('div', "layout").render();

        }

        render() {
            return;
        }
        destroy() {
            return;
        }
    }

    const PATH_SEPARATOR = '.';
    const TARGET = Symbol('target');
    const UNSUBSCRIBE = Symbol('unsubscribe');

    function isBuiltinWithMutableMethods(value) {
    	return value instanceof Date
    		|| value instanceof Set
    		|| value instanceof Map
    		|| value instanceof WeakSet
    		|| value instanceof WeakMap
    		|| ArrayBuffer.isView(value);
    }

    function isBuiltinWithoutMutableMethods(value) {
    	return (typeof value === 'object' ? value === null : typeof value !== 'function') || value instanceof RegExp;
    }

    var isArray = Array.isArray;

    function isSymbol(value) {
    	return typeof value === 'symbol';
    }

    const path = {
    	after: (path, subPath) => {
    		if (isArray(path)) {
    			return path.slice(subPath.length);
    		}

    		if (subPath === '') {
    			return path;
    		}

    		return path.slice(subPath.length + 1);
    	},
    	concat: (path, key) => {
    		if (isArray(path)) {
    			path = [...path];

    			if (key) {
    				path.push(key);
    			}

    			return path;
    		}

    		if (key && key.toString !== undefined) {
    			if (path !== '') {
    				path += PATH_SEPARATOR;
    			}

    			if (isSymbol(key)) {
    				return path + key.toString();
    			}

    			return path + key;
    		}

    		return path;
    	},
    	initial: path => {
    		if (isArray(path)) {
    			return path.slice(0, -1);
    		}

    		if (path === '') {
    			return path;
    		}

    		const index = path.lastIndexOf(PATH_SEPARATOR);

    		if (index === -1) {
    			return '';
    		}

    		return path.slice(0, index);
    	},
    	last: path => {
    		if (isArray(path)) {
    			return path[path.length - 1] || '';
    		}

    		if (path === '') {
    			return path;
    		}

    		const index = path.lastIndexOf(PATH_SEPARATOR);

    		if (index === -1) {
    			return path;
    		}

    		return path.slice(index + 1);
    	},
    	walk: (path, callback) => {
    		if (isArray(path)) {
    			for (const key of path) {
    				callback(key);
    			}
    		} else if (path !== '') {
    			let position = 0;
    			let index = path.indexOf(PATH_SEPARATOR);

    			if (index === -1) {
    				callback(path);
    			} else {
    				while (position < path.length) {
    					if (index === -1) {
    						index = path.length;
    					}

    					callback(path.slice(position, index));

    					position = index + 1;
    					index = path.indexOf(PATH_SEPARATOR, position);
    				}
    			}
    		}
    	},
    	get(object, path) {
    		this.walk(path, key => {
    			if (object) {
    				object = object[key];
    			}
    		});

    		return object;
    	},
    };

    function isIterator(value) {
    	return typeof value === 'object' && typeof value.next === 'function';
    }

    // eslint-disable-next-line max-params
    function wrapIterator(iterator, target, thisArg, applyPath, prepareValue) {
    	const originalNext = iterator.next;

    	if (target.name === 'entries') {
    		iterator.next = function () {
    			const result = originalNext.call(this);

    			if (result.done === false) {
    				result.value[0] = prepareValue(
    					result.value[0],
    					target,
    					result.value[0],
    					applyPath,
    				);
    				result.value[1] = prepareValue(
    					result.value[1],
    					target,
    					result.value[0],
    					applyPath,
    				);
    			}

    			return result;
    		};
    	} else if (target.name === 'values') {
    		const keyIterator = thisArg[TARGET].keys();

    		iterator.next = function () {
    			const result = originalNext.call(this);

    			if (result.done === false) {
    				result.value = prepareValue(
    					result.value,
    					target,
    					keyIterator.next().value,
    					applyPath,
    				);
    			}

    			return result;
    		};
    	} else {
    		iterator.next = function () {
    			const result = originalNext.call(this);

    			if (result.done === false) {
    				result.value = prepareValue(
    					result.value,
    					target,
    					result.value,
    					applyPath,
    				);
    			}

    			return result;
    		};
    	}

    	return iterator;
    }

    function ignoreProperty(cache, options, property) {
    	return cache.isUnsubscribed
    		|| (options.ignoreSymbols && isSymbol(property))
    		|| (options.ignoreUnderscores && property.charAt(0) === '_')
    		|| ('ignoreKeys' in options && options.ignoreKeys.includes(property));
    }

    /**
    @class Cache
    @private
    */
    class Cache {
    	constructor(equals) {
    		this._equals = equals;
    		this._proxyCache = new WeakMap();
    		this._pathCache = new WeakMap();
    		this.isUnsubscribed = false;
    	}

    	_getDescriptorCache() {
    		if (this._descriptorCache === undefined) {
    			this._descriptorCache = new WeakMap();
    		}

    		return this._descriptorCache;
    	}

    	_getProperties(target) {
    		const descriptorCache = this._getDescriptorCache();
    		let properties = descriptorCache.get(target);

    		if (properties === undefined) {
    			properties = {};
    			descriptorCache.set(target, properties);
    		}

    		return properties;
    	}

    	_getOwnPropertyDescriptor(target, property) {
    		if (this.isUnsubscribed) {
    			return Reflect.getOwnPropertyDescriptor(target, property);
    		}

    		const properties = this._getProperties(target);
    		let descriptor = properties[property];

    		if (descriptor === undefined) {
    			descriptor = Reflect.getOwnPropertyDescriptor(target, property);
    			properties[property] = descriptor;
    		}

    		return descriptor;
    	}

    	getProxy(target, path, handler, proxyTarget) {
    		if (this.isUnsubscribed) {
    			return target;
    		}

    		const reflectTarget = target[proxyTarget];
    		const source = reflectTarget || target;

    		this._pathCache.set(source, path);

    		let proxy = this._proxyCache.get(source);

    		if (proxy === undefined) {
    			proxy = reflectTarget === undefined
    				? new Proxy(target, handler)
    				: target;

    			this._proxyCache.set(source, proxy);
    		}

    		return proxy;
    	}

    	getPath(target) {
    		return this.isUnsubscribed ? undefined : this._pathCache.get(target);
    	}

    	isDetached(target, object) {
    		return !Object.is(target, path.get(object, this.getPath(target)));
    	}

    	defineProperty(target, property, descriptor) {
    		if (!Reflect.defineProperty(target, property, descriptor)) {
    			return false;
    		}

    		if (!this.isUnsubscribed) {
    			this._getProperties(target)[property] = descriptor;
    		}

    		return true;
    	}

    	setProperty(target, property, value, receiver, previous) { // eslint-disable-line max-params
    		if (!this._equals(previous, value) || !(property in target)) {
    			const descriptor = this._getOwnPropertyDescriptor(target, property);

    			if (descriptor !== undefined && 'set' in descriptor) {
    				return Reflect.set(target, property, value, receiver);
    			}

    			return Reflect.set(target, property, value);
    		}

    		return true;
    	}

    	deleteProperty(target, property, previous) {
    		if (Reflect.deleteProperty(target, property)) {
    			if (!this.isUnsubscribed) {
    				const properties = this._getDescriptorCache().get(target);

    				if (properties) {
    					delete properties[property];
    					this._pathCache.delete(previous);
    				}
    			}

    			return true;
    		}

    		return false;
    	}

    	isSameDescriptor(a, target, property) {
    		const b = this._getOwnPropertyDescriptor(target, property);

    		return a !== undefined
    			&& b !== undefined
    			&& Object.is(a.value, b.value)
    			&& (a.writable || false) === (b.writable || false)
    			&& (a.enumerable || false) === (b.enumerable || false)
    			&& (a.configurable || false) === (b.configurable || false)
    			&& a.get === b.get
    			&& a.set === b.set;
    	}

    	isGetInvariant(target, property) {
    		const descriptor = this._getOwnPropertyDescriptor(target, property);

    		return descriptor !== undefined
    			&& descriptor.configurable !== true
    			&& descriptor.writable !== true;
    	}

    	unsubscribe() {
    		this._descriptorCache = null;
    		this._pathCache = null;
    		this._proxyCache = null;
    		this.isUnsubscribed = true;
    	}
    }

    function isObject(value) {
    	return toString.call(value) === '[object Object]';
    }

    function isDiffCertain() {
    	return true;
    }

    function isDiffArrays(clone, value) {
    	return clone.length !== value.length || clone.some((item, index) => value[index] !== item);
    }

    const IMMUTABLE_OBJECT_METHODS = new Set([
    	'hasOwnProperty',
    	'isPrototypeOf',
    	'propertyIsEnumerable',
    	'toLocaleString',
    	'toString',
    	'valueOf',
    ]);

    const IMMUTABLE_ARRAY_METHODS = new Set([
    	'concat',
    	'includes',
    	'indexOf',
    	'join',
    	'keys',
    	'lastIndexOf',
    ]);

    const MUTABLE_ARRAY_METHODS = {
    	push: isDiffCertain,
    	pop: isDiffCertain,
    	shift: isDiffCertain,
    	unshift: isDiffCertain,
    	copyWithin: isDiffArrays,
    	reverse: isDiffArrays,
    	sort: isDiffArrays,
    	splice: isDiffArrays,
    	flat: isDiffArrays,
    	fill: isDiffArrays,
    };

    const HANDLED_ARRAY_METHODS = new Set([
    	...IMMUTABLE_OBJECT_METHODS,
    	...IMMUTABLE_ARRAY_METHODS,
    	...Object.keys(MUTABLE_ARRAY_METHODS),
    ]);

    function isDiffSets(clone, value) {
    	if (clone.size !== value.size) {
    		return true;
    	}

    	for (const element of clone) {
    		if (!value.has(element)) {
    			return true;
    		}
    	}

    	return false;
    }

    const COLLECTION_ITERATOR_METHODS = [
    	'keys',
    	'values',
    	'entries',
    ];

    const IMMUTABLE_SET_METHODS = new Set([
    	'has',
    	'toString',
    ]);

    const MUTABLE_SET_METHODS = {
    	add: isDiffSets,
    	clear: isDiffSets,
    	delete: isDiffSets,
    	forEach: isDiffSets,
    };

    const HANDLED_SET_METHODS = new Set([
    	...IMMUTABLE_SET_METHODS,
    	...Object.keys(MUTABLE_SET_METHODS),
    	...COLLECTION_ITERATOR_METHODS,
    ]);

    function isDiffMaps(clone, value) {
    	if (clone.size !== value.size) {
    		return true;
    	}

    	let bValue;
    	for (const [key, aValue] of clone) {
    		bValue = value.get(key);

    		if (bValue !== aValue || (bValue === undefined && !value.has(key))) {
    			return true;
    		}
    	}

    	return false;
    }

    const IMMUTABLE_MAP_METHODS = new Set([...IMMUTABLE_SET_METHODS, 'get']);

    const MUTABLE_MAP_METHODS = {
    	set: isDiffMaps,
    	clear: isDiffMaps,
    	delete: isDiffMaps,
    	forEach: isDiffMaps,
    };

    const HANDLED_MAP_METHODS = new Set([
    	...IMMUTABLE_MAP_METHODS,
    	...Object.keys(MUTABLE_MAP_METHODS),
    	...COLLECTION_ITERATOR_METHODS,
    ]);

    class CloneObject {
    	constructor(value, path, argumentsList, hasOnValidate) {
    		this._path = path;
    		this._isChanged = false;
    		this._clonedCache = new Set();
    		this._hasOnValidate = hasOnValidate;
    		this._changes = hasOnValidate ? [] : null;

    		this.clone = path === undefined ? value : this._shallowClone(value);
    	}

    	static isHandledMethod(name) {
    		return IMMUTABLE_OBJECT_METHODS.has(name);
    	}

    	_shallowClone(value) {
    		let clone = value;

    		if (isObject(value)) {
    			clone = {...value};
    		} else if (isArray(value) || ArrayBuffer.isView(value)) {
    			clone = [...value];
    		} else if (value instanceof Date) {
    			clone = new Date(value);
    		} else if (value instanceof Set) {
    			clone = new Set([...value].map(item => this._shallowClone(item)));
    		} else if (value instanceof Map) {
    			clone = new Map();

    			for (const [key, item] of value.entries()) {
    				clone.set(key, this._shallowClone(item));
    			}
    		}

    		this._clonedCache.add(clone);

    		return clone;
    	}

    	preferredThisArg(isHandledMethod, name, thisArg, thisProxyTarget) {
    		if (isHandledMethod) {
    			if (isArray(thisProxyTarget)) {
    				this._onIsChanged = MUTABLE_ARRAY_METHODS[name];
    			} else if (thisProxyTarget instanceof Set) {
    				this._onIsChanged = MUTABLE_SET_METHODS[name];
    			} else if (thisProxyTarget instanceof Map) {
    				this._onIsChanged = MUTABLE_MAP_METHODS[name];
    			}

    			return thisProxyTarget;
    		}

    		return thisArg;
    	}

    	update(fullPath, property, value) {
    		const changePath = path.after(fullPath, this._path);

    		if (property !== 'length') {
    			let object = this.clone;

    			path.walk(changePath, key => {
    				if (object && object[key]) {
    					if (!this._clonedCache.has(object[key])) {
    						object[key] = this._shallowClone(object[key]);
    					}

    					object = object[key];
    				}
    			});

    			if (this._hasOnValidate) {
    				this._changes.push({
    					path: changePath,
    					property,
    					previous: value,
    				});
    			}

    			if (object && object[property]) {
    				object[property] = value;
    			}
    		}

    		this._isChanged = true;
    	}

    	undo(object) {
    		let change;

    		for (let index = this._changes.length - 1; index !== -1; index--) {
    			change = this._changes[index];

    			path.get(object, change.path)[change.property] = change.previous;
    		}
    	}

    	isChanged(value) {
    		return this._onIsChanged === undefined
    			? this._isChanged
    			: this._onIsChanged(this.clone, value);
    	}
    }

    class CloneArray extends CloneObject {
    	static isHandledMethod(name) {
    		return HANDLED_ARRAY_METHODS.has(name);
    	}
    }

    class CloneDate extends CloneObject {
    	undo(object) {
    		object.setTime(this.clone.getTime());
    	}

    	isChanged(value, equals) {
    		return !equals(this.clone.valueOf(), value.valueOf());
    	}
    }

    class CloneSet extends CloneObject {
    	static isHandledMethod(name) {
    		return HANDLED_SET_METHODS.has(name);
    	}

    	undo(object) {
    		for (const value of this.clone) {
    			object.add(value);
    		}

    		for (const value of object) {
    			if (!this.clone.has(value)) {
    				object.delete(value);
    			}
    		}
    	}
    }

    class CloneMap extends CloneObject {
    	static isHandledMethod(name) {
    		return HANDLED_MAP_METHODS.has(name);
    	}

    	undo(object) {
    		for (const [key, value] of this.clone.entries()) {
    			object.set(key, value);
    		}

    		for (const key of object.keys()) {
    			if (!this.clone.has(key)) {
    				object.delete(key);
    			}
    		}
    	}
    }

    class CloneWeakSet extends CloneObject {
    	constructor(value, path, argumentsList, hasOnValidate) {
    		super(undefined, path, argumentsList, hasOnValidate);

    		this._arg1 = argumentsList[0];
    		this._weakValue = value.has(this._arg1);
    	}

    	isChanged(value) {
    		return this._weakValue !== value.has(this._arg1);
    	}

    	undo(object) {
    		if (this._weakValue && !object.has(this._arg1)) {
    			object.add(this._arg1);
    		} else {
    			object.delete(this._arg1);
    		}
    	}
    }

    class CloneWeakMap extends CloneObject {
    	constructor(value, path, argumentsList, hasOnValidate) {
    		super(undefined, path, argumentsList, hasOnValidate);

    		this._weakKey = argumentsList[0];
    		this._weakHas = value.has(this._weakKey);
    		this._weakValue = value.get(this._weakKey);
    	}

    	isChanged(value) {
    		return this._weakValue !== value.get(this._weakKey);
    	}

    	undo(object) {
    		const weakHas = object.has(this._weakKey);

    		if (this._weakHas && !weakHas) {
    			object.set(this._weakKey, this._weakValue);
    		} else if (!this._weakHas && weakHas) {
    			object.delete(this._weakKey);
    		} else if (this._weakValue !== object.get(this._weakKey)) {
    			object.set(this._weakKey, this._weakValue);
    		}
    	}
    }

    class SmartClone {
    	constructor(hasOnValidate) {
    		this._stack = [];
    		this._hasOnValidate = hasOnValidate;
    	}

    	static isHandledType(value) {
    		return isObject(value)
    			|| isArray(value)
    			|| isBuiltinWithMutableMethods(value);
    	}

    	static isHandledMethod(target, name) {
    		if (isObject(target)) {
    			return CloneObject.isHandledMethod(name);
    		}

    		if (isArray(target)) {
    			return CloneArray.isHandledMethod(name);
    		}

    		if (target instanceof Set) {
    			return CloneSet.isHandledMethod(name);
    		}

    		if (target instanceof Map) {
    			return CloneMap.isHandledMethod(name);
    		}

    		return isBuiltinWithMutableMethods(target);
    	}

    	get isCloning() {
    		return this._stack.length > 0;
    	}

    	start(value, path, argumentsList) {
    		let CloneClass = CloneObject;

    		if (isArray(value)) {
    			CloneClass = CloneArray;
    		} else if (value instanceof Date) {
    			CloneClass = CloneDate;
    		} else if (value instanceof Set) {
    			CloneClass = CloneSet;
    		} else if (value instanceof Map) {
    			CloneClass = CloneMap;
    		} else if (value instanceof WeakSet) {
    			CloneClass = CloneWeakSet;
    		} else if (value instanceof WeakMap) {
    			CloneClass = CloneWeakMap;
    		}

    		this._stack.push(new CloneClass(value, path, argumentsList, this._hasOnValidate));
    	}

    	update(fullPath, property, value) {
    		this._stack[this._stack.length - 1].update(fullPath, property, value);
    	}

    	preferredThisArg(target, thisArg, thisProxyTarget) {
    		const {name} = target;
    		const isHandledMethod = SmartClone.isHandledMethod(thisProxyTarget, name);

    		return this._stack[this._stack.length - 1]
    			.preferredThisArg(isHandledMethod, name, thisArg, thisProxyTarget);
    	}

    	isChanged(isMutable, value, equals) {
    		return this._stack[this._stack.length - 1].isChanged(isMutable, value, equals);
    	}

    	undo(object) {
    		if (this._previousClone !== undefined) {
    			this._previousClone.undo(object);
    		}
    	}

    	stop() {
    		this._previousClone = this._stack.pop();

    		return this._previousClone.clone;
    	}
    }

    /* eslint-disable unicorn/prefer-spread */

    const defaultOptions = {
    	equals: Object.is,
    	isShallow: false,
    	pathAsArray: false,
    	ignoreSymbols: false,
    	ignoreUnderscores: false,
    	ignoreDetached: false,
    	details: false,
    };

    const onChange = (object, onChange, options = {}) => {
    	options = {
    		...defaultOptions,
    		...options,
    	};

    	const proxyTarget = Symbol('ProxyTarget');
    	const {equals, isShallow, ignoreDetached, details} = options;
    	const cache = new Cache(equals);
    	const hasOnValidate = typeof options.onValidate === 'function';
    	const smartClone = new SmartClone(hasOnValidate);

    	// eslint-disable-next-line max-params
    	const validate = (target, property, value, previous, applyData) => !hasOnValidate
    		|| smartClone.isCloning
    		|| options.onValidate(path.concat(cache.getPath(target), property), value, previous, applyData) === true;

    	const handleChangeOnTarget = (target, property, value, previous) => {
    		if (
    			!ignoreProperty(cache, options, property)
    			&& !(ignoreDetached && cache.isDetached(target, object))
    		) {
    			handleChange(cache.getPath(target), property, value, previous);
    		}
    	};

    	// eslint-disable-next-line max-params
    	const handleChange = (changePath, property, value, previous, applyData) => {
    		if (smartClone.isCloning) {
    			smartClone.update(changePath, property, previous);
    		} else {
    			onChange(path.concat(changePath, property), value, previous, applyData);
    		}
    	};

    	const getProxyTarget = value => value
    		? (value[proxyTarget] || value)
    		: value;

    	const prepareValue = (value, target, property, basePath) => {
    		if (
    			isBuiltinWithoutMutableMethods(value)
    			|| property === 'constructor'
    			|| (isShallow && !SmartClone.isHandledMethod(target, property))
    			|| ignoreProperty(cache, options, property)
    			|| cache.isGetInvariant(target, property)
    			|| (ignoreDetached && cache.isDetached(target, object))
    		) {
    			return value;
    		}

    		if (basePath === undefined) {
    			basePath = cache.getPath(target);
    		}

    		return cache.getProxy(value, path.concat(basePath, property), handler, proxyTarget);
    	};

    	const handler = {
    		get(target, property, receiver) {
    			if (isSymbol(property)) {
    				if (property === proxyTarget || property === TARGET) {
    					return target;
    				}

    				if (
    					property === UNSUBSCRIBE
    					&& !cache.isUnsubscribed
    					&& cache.getPath(target).length === 0
    				) {
    					cache.unsubscribe();
    					return target;
    				}
    			}

    			const value = isBuiltinWithMutableMethods(target)
    				? Reflect.get(target, property)
    				: Reflect.get(target, property, receiver);

    			return prepareValue(value, target, property);
    		},

    		set(target, property, value, receiver) {
    			value = getProxyTarget(value);

    			const reflectTarget = target[proxyTarget] || target;
    			const previous = reflectTarget[property];

    			if (equals(previous, value) && property in target) {
    				return true;
    			}

    			const isValid = validate(target, property, value, previous);

    			if (
    				isValid
    				&& cache.setProperty(reflectTarget, property, value, receiver, previous)
    			) {
    				handleChangeOnTarget(target, property, target[property], previous);

    				return true;
    			}

    			return !isValid;
    		},

    		defineProperty(target, property, descriptor) {
    			if (!cache.isSameDescriptor(descriptor, target, property)) {
    				const previous = target[property];

    				if (
    					validate(target, property, descriptor.value, previous)
    					&& cache.defineProperty(target, property, descriptor, previous)
    				) {
    					handleChangeOnTarget(target, property, descriptor.value, previous);
    				}
    			}

    			return true;
    		},

    		deleteProperty(target, property) {
    			if (!Reflect.has(target, property)) {
    				return true;
    			}

    			const previous = Reflect.get(target, property);
    			const isValid = validate(target, property, undefined, previous);

    			if (
    				isValid
    				&& cache.deleteProperty(target, property, previous)
    			) {
    				handleChangeOnTarget(target, property, undefined, previous);

    				return true;
    			}

    			return !isValid;
    		},

    		apply(target, thisArg, argumentsList) {
    			const thisProxyTarget = thisArg[proxyTarget] || thisArg;

    			if (cache.isUnsubscribed) {
    				return Reflect.apply(target, thisProxyTarget, argumentsList);
    			}

    			if (
    				(details === false
    					|| (details !== true && !details.includes(target.name)))
    				&& SmartClone.isHandledType(thisProxyTarget)
    			) {
    				let applyPath = path.initial(cache.getPath(target));
    				const isHandledMethod = SmartClone.isHandledMethod(thisProxyTarget, target.name);

    				smartClone.start(thisProxyTarget, applyPath, argumentsList);

    				let result = Reflect.apply(
    					target,
    					smartClone.preferredThisArg(target, thisArg, thisProxyTarget),
    					isHandledMethod
    						? argumentsList.map(argument => getProxyTarget(argument))
    						: argumentsList,
    				);

    				const isChanged = smartClone.isChanged(thisProxyTarget, equals);
    				const previous = smartClone.stop();

    				if (SmartClone.isHandledType(result) && isHandledMethod) {
    					if (thisArg instanceof Map && target.name === 'get') {
    						applyPath = path.concat(applyPath, argumentsList[0]);
    					}

    					result = cache.getProxy(result, applyPath, handler);
    				}

    				if (isChanged) {
    					const applyData = {
    						name: target.name,
    						args: argumentsList,
    						result,
    					};
    					const changePath = smartClone.isCloning
    						? path.initial(applyPath)
    						: applyPath;
    					const property = smartClone.isCloning
    						? path.last(applyPath)
    						: '';

    					if (validate(path.get(object, changePath), property, thisProxyTarget, previous, applyData)) {
    						handleChange(changePath, property, thisProxyTarget, previous, applyData);
    					} else {
    						smartClone.undo(thisProxyTarget);
    					}
    				}

    				if (
    					(thisArg instanceof Map || thisArg instanceof Set)
    					&& isIterator(result)
    				) {
    					return wrapIterator(result, target, thisArg, applyPath, prepareValue);
    				}

    				return result;
    			}

    			return Reflect.apply(target, thisArg, argumentsList);
    		},
    	};

    	const proxy = cache.getProxy(object, options.pathAsArray ? [] : '', handler);
    	onChange = onChange.bind(proxy);

    	if (hasOnValidate) {
    		options.onValidate = options.onValidate.bind(proxy);
    	}

    	return proxy;
    };

    onChange.target = proxy => (proxy && proxy[TARGET]) || proxy;
    onChange.unsubscribe = proxy => proxy[UNSUBSCRIBE] || proxy;

    class DivComponent {
        constructor(tag) {
            this.el = document.createElement(tag ||'div');
        }

        render(){
           return this.el
        }
    }

    class CurrentWeatherInfo extends DivComponent {

        constructor(currentWeatherState, appState) {
            super();
            this.currentWeatherState = currentWeatherState;
            this.appState = appState;
        }



        initInfo() {
            const weather = this.currentWeatherState;

            const timeFormatter = new Intl.DateTimeFormat("ru-RU",{
                hour: "numeric",
                minute: "numeric",
            });

            const infoWrapper = new ElementGenerator('div',"card").render();

            const now = new Date();
            const day = now.getDate(), month = ("0" + (now.getMonth() + 1)).slice(-2), year = now.getFullYear();

            const blockHead = new ElementGenerator("div", "block-head").render();
            const blockTitle = new ElementGenerator("h3", "primary-text-title", { innerText: "CurrentWeather" }).render();
            const blockTime = new ElementGenerator("span", "time", { innerText: `${day}.${month}.${year}` }).render();



            const currentWeatherLayout = new ElementGenerator("div", 'current-weather-layout').render();

            const currentWeatherImgLayout = new ElementGenerator("div",'current-layout-img' ).render();
            const currentWeatherImg = new ElementGenerator("img", 'weather-img', { src: `https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png` }).render();
            const currentWeatherImgDescription = new ElementGenerator("p", 'weather-description', { innerText: weather.weather[0].main }).render();
            currentWeatherImgLayout.append(currentWeatherImg);
            currentWeatherImgLayout.append(currentWeatherImgDescription);

            currentWeatherLayout.append(currentWeatherImgLayout);

            const currentWeatherTemp = new ElementGenerator("div", "degree-wrapper").render();

            const formattedCurrentTemperature = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }).format(weather.main.temp);

            const resultCurrentTemperature = `${formattedCurrentTemperature}°C`;


            const formattedFeelTemperature = new Intl.NumberFormat('en-US', {
                style: 'decimal',
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
            }).format(weather.main.feels_like);

            const resultFeelTemperature = `${formattedFeelTemperature}°C`;

            const currentDegree = new ElementGenerator("p", "current-degree", { innerText: resultCurrentTemperature }).render();
            const realFeel = new ElementGenerator("p", "current-real-feel", { innerText: `Real feel: ${resultFeelTemperature}` }).render();

            const sunriseLayout = new ElementGenerator("div", "sun-info-wrapper").render();
            const sunriseTitle = new ElementGenerator("span", "sun-info-child",{innerText:"Sunrise:"}).render();
            const sunriseValue = new ElementGenerator("span", "sun-info-child",{innerText: timeFormatter.format(new Date((this.appState.forecast.city.sunrise ?? 0) * 1000)) }).render();

            const sunsetLayout = new ElementGenerator("div", "sun-info-wrapper").render();
            const sunsetTitle = new ElementGenerator("span", "sun-info-child",{innerText:"Sunset:"}).render();
            const sunsetValue = new ElementGenerator("span", "sun-info-child",{innerText: timeFormatter.format(new Date((this.appState.forecast.city.sunset ?? 0) * 1000)) }).render();

          const sunInfo = new ElementGenerator("div", "sun-info").render();

            sunriseLayout.append(sunriseTitle);
            sunriseLayout.append(sunriseValue);
            sunsetLayout.append(sunsetTitle);
            sunsetLayout.append(sunsetValue);


            sunInfo.append(sunriseLayout);
            sunInfo.append(sunsetLayout);

            currentWeatherTemp.append(currentDegree);
            currentWeatherTemp.append(realFeel);
            currentWeatherLayout.append(currentWeatherTemp);

            blockHead.append(blockTitle);
            blockHead.append(blockTime);

            infoWrapper.append(blockHead);
            infoWrapper.append(currentWeatherLayout);

            currentWeatherLayout.append(sunInfo);

            return infoWrapper;
        }

        render() {
           // this.el.classList.add("card__wrapper");

            const info = this.initInfo();

            this.el.append(info);

            return this.el;
        }

    }

    const tableRules =[
        ["dt_txt"],
        [ "weather", 0 ,"main"],
        ["main", "temp"],
        ["main", "feels_like"],
        ["wind","speed"]

    ];
    const columns =[ "Time", "Weather", "Degree", "Feels like", "Winter"];
    class Hourly extends DivComponent{

        constructor(hourly, appState) {
            super();

            this.hourly = hourly?.slice(0,8) ?? [];
            this.appState = appState;
        }

        initTitle(){

            const title = new ElementGenerator("div","block-head" ).render();

            const blockTitle = new ElementGenerator("h3", "primary-text-title", { innerText: "Hourly" }).render();

            title.append(blockTitle);

            return title

        }

        prepareData(){

            const res = this.hourly.map((weather,index)=>{

                const w = tableRules.map((path,index)=>{

                    const value ={
                        value:this.getValueByNestedKeys(weather,path),
                        column:columns[index]
                    };

                    return value
                });


                return w
            });

            return res

        }

        initHourly(){
            const hourlyWrapper = new ElementGenerator("div","hourly-wrapper").render();

            const hourlyTable = new ElementGenerator("table", "hourly-table").render();
            const hourlyHead = new ElementGenerator("thead").render();
            const hourlyBody= new ElementGenerator("tbody").render();


                const c = this.renderRow(columns.map(col=>({column:col,value:col})),true);
            hourlyHead.append(c);


            const d = this.prepareData();


           d.forEach(values=>{

               const rowHeader = this.renderRow(values );


               hourlyBody.append(rowHeader);

           });

            hourlyTable.append(hourlyHead);
            hourlyTable.append(hourlyBody);

    hourlyWrapper.append(hourlyTable);

            return hourlyWrapper
        }

         getValueByNestedKeys(object, keys) {
            try {
                let value = object;

                for (const key of keys) {
                    value = value[key];
                }

                return value;
            } catch (error) {
                console.error('Error:', error);
                return undefined;
            }
        }

        renderRow(cells,isHeader){
             const row = new ElementGenerator("tr", "hourly-row").render();



            cells.forEach(value=>{

                const cell = this.renderCell(value,isHeader);

                row.append(cell);


            });

            return row
        }

        renderCell({value,column} , isHeader){

            let data = value;

            if(!isHeader){
                switch (column){
                    case "Time":
                        data = value.slice(-9,-3);
                        // data = new Intl.DateTimeFormat("ru-RU",{
                        //     hour: "numeric",
                        //     minute: "numeric",
                        // }).format(new Date(value * 1000))
                        break
                    case "Degree" :
                        data = new Intl.NumberFormat('en-US', {
                            style: 'unit',
                            unit: 'celsius',
                        }).format(value);
                        break
                    case "Feels like" :
                        data = new Intl.NumberFormat('en-US', {
                            style: 'unit',
                            unit: 'celsius',
                        }).format(value);
                        break
                    case "Winter" :
                        data = `${value} SE`;
                        break
                    default:
                        data = value;
                }
            }


            return new ElementGenerator(isHeader?"th":"td", "hourly-cell", {innerText: data}).render()
        }


        render(){

            this.el.classList.add("card");

            const hour = this.initHourly();
            const title = this.initTitle();


            this.el.append(title);
            this.el.append(hour);



            return this.el
        }
    }

    class Header extends DivComponent {

        menuList = [
            {
                src: "../../../static/assets/search.png",
                textContent: "Now",
                alt: "main forecast",
                href: "#"
            }, {
                src: "../../../static/assets/favorites_dark.svg",
                textContent: "Five days",
                alt: "forecast to five days",
                href: "#fiveDays"

            },
        ];

        constructor(appState) {
            super('header');
            this.appState = appState;
        }

        initMenu() {

            const menu = new ElementGenerator('nav', 'menu').render();

            this.menuList.forEach(item => {
                const itemMenu = new ElementGenerator('a', "menu__item", {
                    textContent: item.textContent,
                    href: item.href
                }).render();

                const icon = new ElementGenerator('img', undefined, {
                    src: item.src,
                    alt: item.alt
                }).render();
                itemMenu.prepend(icon);

                menu.append(itemMenu);
            });


            this.el.append(menu);
        }



        render() {
            this.el.innerHTML = "";
            this.el.classList.add("header");


            this.initMenu();

            return this.el;
        }
    }

    class Search extends DivComponent {

        constructor(state,cityHandler) {
            super();
            this.state = state;
            this.searchHandler = cityHandler;

        }

        search() {
            const value = this.el.querySelector(".search__input").value;
            this.searchHandler(value);
        }

        inputInit() {
            const input = new ElementGenerator('input', 'search__input', {
                placeholder: "City"
            }).render();

            input.addEventListener("keydown", (event) => {
                if (event.code === "Enter") {
                    this.search();
                }
            });

            return input;
        }

        inititIcon() {
            const icon = new ElementGenerator("img", "search__icon", {
                src: "../../../static/assets/search.png",
                alt: "search icon",
                width: 24,
                height: 24,
            }).render();

            return icon;
        }

        initButton() {
            const button = new ElementGenerator('button', 'search__button',).render();

            const icon = new ElementGenerator("img", "search__icon__button", {
                src: "../../../static/assets/search.svg",
                alt: "search icon",
                width: 28,
                height: 28
            }).render();

            button.addEventListener("click", this.search.bind(this));


            button.append(icon);

            return button;
        }

        render() {
            this.el.classList.add("search-wrapper");


            const input = this.inputInit();
            this.el.append(input);

            const icon = this.inititIcon();
            this.el.append(icon);

            const button = this.initButton();
            this.el.append(button);

            return this.el;
        }
    }

    class MainView extends View {

        state = {
            list: [],
            loading: false,
            searchQuery: undefined,
            offset: 0,
            weather: null,
            hourly: []
        };
        constructor(appState,cityHandler) {
            super();
            this.setTitle("Today weather");
            this.appState = appState;
            this.appState = onChange(this.appState, this.appStateHook.bind(this));
            this.state = onChange(this.state, this.stateHook.bind(this));
            this.state.weather = appState.forecast?.list?.[0];
            this.state.hourly = appState?.forecast?.list ?? [];
    this.cityHandler = cityHandler;
        }


        appStateHook(path) {

            if (path === "favorites") {
                this.render();
                this.renderList();
            }
        }
        async stateHook(path) {

            if (path === "searchQuery") {

                this.state.loading = true;
                const data = await this.loadList(this.state.searchQuery, this.state.offset);

                this.state.loading = false;
                this.state.list = data.docs.concat();
            }
            if (path === "list" || path === "loading") {
                this.renderList();
            }
        }


        renderCurrentInfo(){
            const currentInfo = new CurrentWeatherInfo(this.state.weather, this.appState).render();

            this.main.append(currentInfo);
        }

        renderHourly(){
            const hourly = new Hourly(this.state.hourly, this.appState).render();
            this.main.append(hourly);
        }

        initHeader(){
            const header = new Header().render();

            const search = new Search(this.appState,this.cityHandler).render();
            header.append(search);

          this.main.append(header);
        }

        render() {
            this.main = new ElementGenerator("div").render();
            this.main.classList.add("today-wrapper");
            this.app.innerHTML = "";
            this.initHeader();
            if (this.state.weather){
                this.renderCurrentInfo();
            }
            if (this.state.hourly.length > 0){
                this.renderHourly();
            }
            this.app.append(this.main);

        }

        destroy() {
            this.main.remove();
        }
    }

    class Forecast{

        #_KEY = "a65a3f613545bf5b9fac5ec4b39fe7bd"

        async loadForecast(city) {
           if(city){
               const response = await fetch(`http://api.openweathermap.org/data/2.5/forecast?units=metric&q=${city}&appid=${this.#_KEY}`);

               return await response.json();
           }
        }
    }

    class ForecastCard extends DivComponent {

        constructor(currentWeatherState, appState) {
            super();
            this.currentWeatherState = currentWeatherState;
            this.appState = appState;

        }



        initInfo() {


            const weather = this.currentWeatherState;
            const infoWrapper = new ElementGenerator('div', 'card-item').render();
            const dateFormatter = new Intl.DateTimeFormat("en-EN",{
                day: "numeric",
                month: "short",
            });
            const dayFormatter = new Intl.DateTimeFormat("en-EN",{
                weekday: "short",
            });
            const dayName = new ElementGenerator("p", "primary-text-title",{
                textContent: dayFormatter.format(new Date(weather.dt * 1000))
            }).render();


            const dateName = new ElementGenerator("p", "light-text",{
                textContent: dateFormatter.format(new Date(weather.dt * 1000))
            }).render();

            const cardImg = new ElementGenerator('img', "weather-icon",{src:`https://openweathermap.org/img/wn/${weather.weather[0].icon}@4x.png`}).render();



            infoWrapper.append(dayName);
            infoWrapper.append(dateName);
            infoWrapper.append(cardImg);

            return infoWrapper;
        }



        render() {
             this.el.classList.add("card-wrapper");

            const info = this.initInfo();


            this.el.append(info);

            return this.el;
        }

    }

    class FiveDaysView extends View {

        state = {
            list: [],
            loading: false,
            searchQuery: undefined,
            offset: 0,
            weather: null,
            hourly: []
        };
        constructor(appState,cityHandler) {
            super();
            this.setTitle("Five Days weather");
            this.appState = appState;
            this.state.weather = appState.forecast?.list?.[0];
            this.state.hourly = appState.forecast?.list ?? [];
            this.cityHandler = cityHandler;
        }

        initHeader(){
            const header = new Header().render();

            const search = new Search(this.appState,this.cityHandler).render();
            header.append(search);

            this.main.append(header);
        }

        renderList(){
                const wrapper = new ElementGenerator("div", "forecast-wrapper").render();
          this.appState.forecast &&  Object.values(this.appState.forecastDict).forEach((forecastArr)=>{

                const moment =forecastArr[Math.floor(forecastArr.length / 2)];
                const card = new ForecastCard(moment, this.appState).render();

                wrapper.append(card);



            });

            return wrapper

        }
        renderHourly(weather){
            const hourly = new Hourly(weather,this.appState).render();

            return hourly

        }

        render() {
            this.main = new ElementGenerator("div").render();
            this.initHeader();
            this.main.classList.add("fiveDays");
            this.app.innerHTML = "";
            const forecast = this.renderList();
            this.main.append(forecast);
       if(this.state.hourly.length > 0){
           const hourly = this.renderHourly( this.state.hourly);
           this.main.append(hourly);
       }

            this.app.append(this.main);

        }

        destroy() {
            this.main.remove();
        }
    }

    class App {
        routes = [
            { path: "", view: MainView },
            { path: "fiveDays", view: FiveDaysView }
        ];
        appState = {
            favorites: [],
            forecast: null,
            forecastDict:null,
            city: "",
        };
        constructor() {

            window.addEventListener("hashchange", this.route.bind(this));
            this.route();

            this.appState = onChange(this.appState, this.cityStateHook.bind(this));
        }
        async cityStateHook(path, value, previousValue, applyData) {
            // console.log("______N E W________")
            // console.log('path:', path);
            // console.log('value:', value);
            // console.log('previousValue:', previousValue);
            // console.log('applyData:', applyData);
            if(path === "city"){
                this.loadData(value);
            }

            if (path === "forecast"){
                this.route();
            }
        }

        cityHandler= (value)=>{
            this.appState.city = value;
            console.log("handler", this.appState);
        }

        async loadData(city){
            const forecats = await new Forecast().loadForecast(city);
            console.log(forecats);
            const dict ={};

            forecats?.list?.forEach((weather)=>{
                const date = weather.dt_txt.slice(0,10);
                if(dict[date]){
                    dict[date].push(weather);
                }else {
                    dict[date] = [weather];
                }
            });
            this.appState.forecastDict = dict;
            this.appState.forecast = forecats;

        }


       async route() {


            if (this.currentView) {
                this.currentView.destroy();
            }

            const { view } = this.routes.find(route => route.path === location.hash.slice(1));

            this.currentView = new view(this.appState,this.cityHandler);

            this.currentView.render();

        }
    }

    new App();

})();
