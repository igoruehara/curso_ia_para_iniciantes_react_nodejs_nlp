// backend/utils.js

const axios = require('axios');

function processPlaceholders(text, context) {
    if (typeof text !== 'string') {
        return text;
    }

    return text.replace(/\{\{(.+?)\}\}/g, (match, expression) => {
        try {
            const func = new Function('context', 'with (context) { return ' + expression + '; }');
            return func(context);
        } catch (error) {
            console.error('Erro ao processar placeholder:', error);
            return match;
        }
    });
}

function processObjectPlaceholders(obj, context) {
    const func = obj.function;
    delete obj.function;

    const processValue = (value) => {
        if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
            return new Function('context', value.slice(1, -1))(context);
        }
        if (typeof value === 'string') {
            return value.replace(/\{\{([\w\.]+)\}\}/g, (match, p1) => {
                const keys = p1.split('.');
                let val = context.slots;
                for (const key of keys) {
                    val = val[key];
                    if (val === undefined) {
                        return match;
                    }
                }
                return val;
            });
        }
        return value;
    };

    const processObject = (inputObj) => {
        if (Array.isArray(inputObj)) {
            return inputObj.map(item => processObject(item));
        } else if (typeof inputObj === 'object' && inputObj !== null) {
            const outputObj = {};
            for (const [key, value] of Object.entries(inputObj)) {
                if (typeof value === 'object' && value !== null) {
                    outputObj[key] = processObject(value);
                } else {
                    outputObj[key] = processValue(value);
                }
            }
            return outputObj;
        } else {
            return processValue(inputObj);
        }
    };
    let payload = processObject(obj);
    return { ...payload, function: func };
}

function evaluateCondition(condition, context) {
    try {
        return new Function('context', `return ${condition};`)(context);
    } catch (error) {
        return condition;
    }
}

async function callApi(apiConfigs, context) {
    let respName;
    for (const apiConfig of apiConfigs) {
        try {
            const { url, method, headers, body, params, responseName, condition } = processObjectPlaceholders(apiConfig, context);
            respName = responseName;
            if (condition == true || condition == undefined) {
                const response = await axios({
                    url,
                    method,
                    headers,
                    data: body,
                    params
                });
                context.slots[responseName] = response?.data;
            }
        } catch (error) {
            console.error('Erro ao chamar a API:', error);
            respName ? context.slots[respName] = JSON.stringify(error) : context.slots.apiError = JSON.stringify(error);
        }
    }
    return context;
}

async function getFunctions(functions, context) {
    for (const [key, value] of Object.entries(functions)) {
        if (typeof value === 'string' && value.startsWith('%') && value.endsWith('%')) {
            context.slots[key] = new Function('context', value.slice(1, -1))(context);
        } else {
            context.slots[key] = value;
        }
    }
    return context;
}

module.exports = {
    processPlaceholders,
    processObjectPlaceholders,
    evaluateCondition,
    callApi,
    getFunctions
};
