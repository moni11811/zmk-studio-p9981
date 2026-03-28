import * as _m0 from "protobufjs/minimal";

function createBaseMacroStep() {
    return { type: 0, behaviorId: 0, param1: 0, param2: 0, durationMs: 0 };
}
const MacroStep = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.type !== 0) writer.uint32(8).int32(message.type);
        if (message.behaviorId !== 0) writer.uint32(16).uint32(message.behaviorId);
        if (message.param1 !== 0) writer.uint32(24).uint32(message.param1);
        if (message.param2 !== 0) writer.uint32(32).uint32(message.param2);
        if (message.durationMs !== 0) writer.uint32(40).uint32(message.durationMs);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseMacroStep();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.type = reader.int32();
                    continue;
                case 2:
                    message.behaviorId = reader.uint32();
                    continue;
                case 3:
                    message.param1 = reader.uint32();
                    continue;
                case 4:
                    message.param2 = reader.uint32();
                    continue;
                case 5:
                    message.durationMs = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseMacroSummary() {
    return { id: 0, name: "", stepCount: 0 };
}
const MacroSummary = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.id !== 0) writer.uint32(8).uint32(message.id);
        if (message.name !== "") writer.uint32(18).string(message.name);
        if (message.stepCount !== 0) writer.uint32(24).uint32(message.stepCount);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseMacroSummary();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
                    continue;
                case 3:
                    message.stepCount = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseMacroDetails() {
    return { id: 0, name: "", steps: [], defaultWaitMs: 0, defaultTapMs: 0 };
}
const MacroDetails = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.id !== 0) writer.uint32(8).uint32(message.id);
        if (message.name !== "") writer.uint32(18).string(message.name);
        for (const step of message.steps) {
            MacroStep.encode(step, writer.uint32(26).fork()).ldelim();
        }
        if (message.defaultWaitMs !== 0) writer.uint32(32).uint32(message.defaultWaitMs);
        if (message.defaultTapMs !== 0) writer.uint32(40).uint32(message.defaultTapMs);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseMacroDetails();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.id = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
                    continue;
                case 3:
                    message.steps.push(MacroStep.decode(reader, reader.uint32()));
                    continue;
                case 4:
                    message.defaultWaitMs = reader.uint32();
                    continue;
                case 5:
                    message.defaultTapMs = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseGetMacroDetailsRequest() {
    return { macroId: 0 };
}
const GetMacroDetailsRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.macroId !== 0) writer.uint32(8).uint32(message.macroId);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseGetMacroDetailsRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.macroId = reader.uint32();
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseSetMacroStepsRequest() {
    return { macroId: 0, name: "", steps: [], defaultWaitMs: 0, defaultTapMs: 0 };
}
const SetMacroStepsRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.macroId !== 0) writer.uint32(8).uint32(message.macroId);
        if (message.name !== "") writer.uint32(18).string(message.name);
        for (const step of message.steps) {
            MacroStep.encode(step, writer.uint32(26).fork()).ldelim();
        }
        if (message.defaultWaitMs !== 0) writer.uint32(32).uint32(message.defaultWaitMs);
        if (message.defaultTapMs !== 0) writer.uint32(40).uint32(message.defaultTapMs);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseSetMacroStepsRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.macroId = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
                    continue;
                case 3:
                    message.steps.push(MacroStep.decode(reader, reader.uint32()));
                    continue;
                case 4:
                    message.defaultWaitMs = reader.uint32();
                    continue;
                case 5:
                    message.defaultTapMs = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseDeleteMacroRequest() {
    return { macroId: 0 };
}
const DeleteMacroRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.macroId !== 0) writer.uint32(8).uint32(message.macroId);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseDeleteMacroRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.macroId = reader.uint32();
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseRequest() {
    return {
        listAllMacros: false,
        getMacroDetails: undefined,
        setMacroSteps: undefined,
        createMacro: false,
        deleteMacro: undefined,
        saveChanges: false,
        discardChanges: false,
        checkUnsavedChanges: false,
    };
}
export const Request = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.listAllMacros === true) writer.uint32(8).bool(message.listAllMacros);
        if (message.getMacroDetails !== undefined) {
            GetMacroDetailsRequest.encode(message.getMacroDetails, writer.uint32(18).fork()).ldelim();
        }
        if (message.setMacroSteps !== undefined) {
            SetMacroStepsRequest.encode(message.setMacroSteps, writer.uint32(26).fork()).ldelim();
        }
        if (message.createMacro === true) writer.uint32(32).bool(message.createMacro);
        if (message.deleteMacro !== undefined) {
            DeleteMacroRequest.encode(message.deleteMacro, writer.uint32(42).fork()).ldelim();
        }
        if (message.saveChanges === true) writer.uint32(48).bool(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(56).bool(message.discardChanges);
        if (message.checkUnsavedChanges === true) writer.uint32(64).bool(message.checkUnsavedChanges);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.listAllMacros = reader.bool();
                    continue;
                case 2:
                    message.getMacroDetails = GetMacroDetailsRequest.decode(reader, reader.uint32());
                    continue;
                case 3:
                    message.setMacroSteps = SetMacroStepsRequest.decode(reader, reader.uint32());
                    continue;
                case 4:
                    message.createMacro = reader.bool();
                    continue;
                case 5:
                    message.deleteMacro = DeleteMacroRequest.decode(reader, reader.uint32());
                    continue;
                case 6:
                    message.saveChanges = reader.bool();
                    continue;
                case 7:
                    message.discardChanges = reader.bool();
                    continue;
                case 8:
                    message.checkUnsavedChanges = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseListAllMacrosResponse() {
    return { macros: [] };
}
const ListAllMacrosResponse = {
    encode(message, writer = _m0.Writer.create()) {
        for (const macro of message.macros) {
            MacroSummary.encode(macro, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseListAllMacrosResponse();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.macros.push(MacroSummary.decode(reader, reader.uint32()));
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseCreateMacroResponse() {
    return { ok: undefined, err: undefined };
}
const CreateMacroResponse = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.ok !== undefined) writer.uint32(8).uint32(message.ok);
        if (message.err !== undefined) writer.uint32(16).bool(message.err);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseCreateMacroResponse();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.ok = reader.uint32();
                    continue;
                case 2:
                    message.err = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseResponse() {
    return {
        listAllMacros: undefined,
        getMacroDetails: undefined,
        setMacroSteps: 0,
        createMacro: undefined,
        deleteMacro: false,
        saveChanges: 0,
        discardChanges: false,
        checkUnsavedChanges: false,
    };
}
export const Response = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.listAllMacros !== undefined) {
            ListAllMacrosResponse.encode(message.listAllMacros, writer.uint32(10).fork()).ldelim();
        }
        if (message.getMacroDetails !== undefined) {
            MacroDetails.encode(message.getMacroDetails, writer.uint32(18).fork()).ldelim();
        }
        if (message.setMacroSteps !== 0) writer.uint32(24).int32(message.setMacroSteps);
        if (message.createMacro !== undefined) {
            CreateMacroResponse.encode(message.createMacro, writer.uint32(34).fork()).ldelim();
        }
        if (message.deleteMacro === true) writer.uint32(40).bool(message.deleteMacro);
        if (message.saveChanges !== 0) writer.uint32(48).int32(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(56).bool(message.discardChanges);
        if (message.checkUnsavedChanges === true) writer.uint32(64).bool(message.checkUnsavedChanges);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseResponse();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.listAllMacros = ListAllMacrosResponse.decode(reader, reader.uint32());
                    continue;
                case 2:
                    message.getMacroDetails = MacroDetails.decode(reader, reader.uint32());
                    continue;
                case 3:
                    message.setMacroSteps = reader.int32();
                    continue;
                case 4:
                    message.createMacro = CreateMacroResponse.decode(reader, reader.uint32());
                    continue;
                case 5:
                    message.deleteMacro = reader.bool();
                    continue;
                case 6:
                    message.saveChanges = reader.int32();
                    continue;
                case 7:
                    message.discardChanges = reader.bool();
                    continue;
                case 8:
                    message.checkUnsavedChanges = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseNotification() {
    return { unsavedChangesStatusChanged: false };
}
export const Notification = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.unsavedChangesStatusChanged === true) {
            writer.uint32(8).bool(message.unsavedChangesStatusChanged);
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseNotification();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.unsavedChangesStatusChanged = reader.bool();
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};
