// backend/ConversationalBot.js

const { NlpManager } = require('node-nlp');
const { processPlaceholders, processObjectPlaceholders, evaluateCondition, callApi, getFunctions } = require('./utils');

class ConversationalBot {
    constructor(config = {}) {
        this.manager = new NlpManager({
            ner: { threshold: 1 },
            threshold: 1,
            languages: ['pt'],
            autoSave: false,
            forceNER: true,
            logger: false,
            nlu: { log: false, useNoneFeature: true }
        });
        this.config = config;
    }

    addEntities(entities) {
        entities.forEach(entity => {
            if (entity.type === 'regex') {
                console.log(`Adicionando entidade regex: ${entity.name}, padrão: ${entity.value}`);
                this.manager.addRegexEntity(entity.name, 'pt', entity.value);
            } else if (entity.type === 'enum') {
                this.manager.addNamedEntityText(entity.name, entity.value[0], 'pt', entity.value);
            } else {
                console.warn(`Tipo de entidade não suportado: ${entity.type}`);
            }
        });
    }
    
    


    addSlots(intents) {
        this.slots = intents;
    }

    addIntents(documents) {
        documents.forEach(doc => {
            doc.text.forEach(phrase => {
                this.manager.addDocument('pt', phrase, doc.intent);
            });
        });
    }

    async train() {
        await this.manager.train();
        const train = await this.manager.export(true);
        await this.manager.import(train);
    }

    async processInput(input, context) {
        context.slots.userInput = input;
        if (!context.slots.currentIntent) {
            const response = await this.manager.process('pt', input);
            context.slots.currentIntent = response?.intent;
            context.slots.sentimento = response?.sentiment;

            if (response?.entities && response?.entities.length > 0) {
                const transformedObject = response?.entities.reduce((acc, item) => {
                    acc[item.entity] = {
                        acuracia: item.accuracy,
                        canonica: item.sourceText,
                        texto: item.utteranceText
                    };
                    return acc;
                }, {});

                context.slots.entities = transformedObject;
            }

            const result = await this.firstQuestion(context.slots.currentIntent, context);

            context = await this.executeSlotActionsFirstQuestion(result?.slot, context);

            const question = await processPlaceholders(result?.slot.question, context);

            let lastContext = result.context;

            if (!result?.slot?.jumpTo || result?.slot?.jumpTo === "") {
                return { question, context: undefined };
            }

            return { question, context: lastContext };
        } else {
            const response = await this.manager.process('pt', input);
            context.slots.currentIntent = response.intent;
            if (response?.entities && response?.entities.length > 0) {
                const transformedObject = response?.entities.reduce((acc, item) => {
                    acc[item.entity] = {
                        acuracia: item.accuracy,
                        canonica: item.sourceText,
                        texto: item.utteranceText
                    };
                    return acc;
                }, {});

                context.slots.entities = transformedObject;
            }
            let currentSlot = await this.getCurrentSlot(context);

            const requiredEntity = response.entities.find(e => e.entity === currentSlot.entity);
            let nextSlot;

            if (requiredEntity != undefined || currentSlot.entity === 'true') {
                context.slots[currentSlot.slot] = requiredEntity?.sourceText || input;

                currentSlot = await processObjectPlaceholders(currentSlot, context);

                nextSlot = await this.getNextSlot(currentSlot, context);

                if (!nextSlot) {
                    context.slots.currentIntent = null;
                    const question = await processPlaceholders(currentSlot.question, context);
                    return { question, context };
                }

                context.slots.currentSlot = nextSlot.slot;

                context = await this.executeSlotActions(currentSlot, context);
                context = await this.executeSlotActionsFirstQuestion(nextSlot, context);
                const question = await processPlaceholders(nextSlot.question, context);
                return { question, context };
            } else {
                const question = await processPlaceholders(currentSlot.fallback, context);
                return { question, context };
            }
        }
    }

    async executeSlotActions(slot, context) {
        if (slot?.callApi && slot?.callApi.length > 0 && slot?.callApi[0]?.execute == 'afterQuestion') {
            context = await callApi(slot.callApi, context);
        }

        if (slot?.function && slot?.function?.execute == 'afterQuestion') {
            const resp = await getFunctions(slot.function, context);
            context = { ...context, ...resp };
        }

        return context;
    }

    async executeSlotActionsFirstQuestion(slot, context) {
        if (slot?.callApi && slot?.callApi.length > 0 && slot?.callApi[0]?.execute == 'firstQuestion') {
            context = await callApi(slot.callApi, context);
        }

        if (slot?.function && slot?.function?.execute == 'firstQuestion') {
            const resp = await getFunctions(slot.function, context);
            context = { ...context, ...resp };
        }

        return context;
    }

    async getCurrentSlot(context) {
        let currentSlot;
        for (const item of this.slots) {
            item.questions.forEach(innerSlot => {
                if (innerSlot.slot === context.slots.currentSlot) {
                    currentSlot = innerSlot;
                }
            });
        }
        return currentSlot;
    }

    async getNextSlot(currentSlot, context) {
        let nextSlot;
        for (const item of this.slots) {
            // Verifica se o item.name é igual a currentSlot.jumpTo
            if (item.name.includes(currentSlot.jumpTo)) {
                for (const innerSlot of item.questions) {
                    if (evaluateCondition(innerSlot.condition, context)) {
                        nextSlot = innerSlot;
                        return nextSlot;
                    }
                }
            } else {
                // Verifica se innerSlot.slot é igual a currentSlot.jumpTo
                for (const innerSlot of item.questions) {
                    if (innerSlot.slot === currentSlot.jumpTo) {
                        if (evaluateCondition(innerSlot.condition, context)) {
                            nextSlot = innerSlot;
                            return nextSlot;
                        }
                    }
                }
            }
        }

        // Se nenhum slot correspondente for encontrado, verifica o 'None'
        const slotsNone = this.slots.find(i => i.name.includes('None'));
        if (slotsNone) {
            for (const slot of slotsNone.questions) {
                if (evaluateCondition(slot.condition, context)) {
                    context.slots.currentSlot = slot.slot;
                    return slot;
                }
            }
        }

        return nextSlot;
    }

    async firstQuestion(intentName, context) {
        const slots = this.slots.find(i => i.name.includes(intentName));

        if (!slots) {
            // Se a intent não foi encontrada, verifica o 'None'
            const slotsNone = this.slots.find(i => i.name.includes('None'));
            if (slotsNone) {
                for (const slot of slotsNone.questions) {
                    if (evaluateCondition(slot.condition, context)) {
                        context.slots.currentSlot = slot.slot;
                        return { slot, context };
                    }
                }
            } else {
                throw new Error('Intent não encontrada e nenhuma intenção "None" definida.');
            }
        }

        for (const slot of slots.questions) {
            if (evaluateCondition(slot.condition, context)) {
                context.slots.currentSlot = slot.slot;
                return { slot, context };
            }
        }

        // Se nenhum slot correspondente for encontrado, verifica o 'None'
        const slotsNone = this.slots.find(i => i.name.includes('None'));
        if (slotsNone) {
            for (const slot of slotsNone.questions) {
                if (evaluateCondition(slot.condition, context)) {
                    context.slots.currentSlot = slot.slot;
                    return { slot, context };
                }
            }
        }
    }
}

module.exports = ConversationalBot;
