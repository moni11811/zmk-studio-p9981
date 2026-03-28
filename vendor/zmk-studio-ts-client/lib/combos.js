import * as _m0 from "protobufjs/minimal";
import { BehaviorBinding } from "./keymap";

function createBaseComboSummary() {
    return { id: 0, name: "", keyCount: 0 };
}
const ComboSummary = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.id !== 0) writer.uint32(8).uint32(message.id);
        if (message.name !== "") writer.uint32(18).string(message.name);
        if (message.keyCount !== 0) writer.uint32(24).uint32(message.keyCount);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseComboSummary();
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
                    message.keyCount = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseComboDetails() {
    return {
        id: 0,
        name: "",
        keyPositions: [],
        binding: undefined,
        timeoutMs: 0,
        requirePriorIdleMs: 0,
        slowRelease: false,
        layerMask: 0,
    };
}
const ComboDetails = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.id !== 0) writer.uint32(8).uint32(message.id);
        if (message.name !== "") writer.uint32(18).string(message.name);
        writer.uint32(26).fork();
        for (const keyPosition of message.keyPositions) {
            writer.int32(keyPosition);
        }
        writer.ldelim();
        if (message.binding !== undefined) {
            BehaviorBinding.encode(message.binding, writer.uint32(34).fork()).ldelim();
        }
        if (message.timeoutMs !== 0) writer.uint32(40).int32(message.timeoutMs);
        if (message.requirePriorIdleMs !== 0) writer.uint32(48).int32(message.requirePriorIdleMs);
        if (message.slowRelease === true) writer.uint32(56).bool(message.slowRelease);
        if (message.layerMask !== 0) writer.uint32(64).uint32(message.layerMask);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseComboDetails();
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
                    if ((tag & 7) === 2) {
                        const limit = reader.uint32() + reader.pos;
                        while (reader.pos < limit) {
                            message.keyPositions.push(reader.int32());
                        }
                    } else {
                        message.keyPositions.push(reader.int32());
                    }
                    continue;
                case 4:
                    message.binding = BehaviorBinding.decode(reader, reader.uint32());
                    continue;
                case 5:
                    message.timeoutMs = reader.int32();
                    continue;
                case 6:
                    message.requirePriorIdleMs = reader.int32();
                    continue;
                case 7:
                    message.slowRelease = reader.bool();
                    continue;
                case 8:
                    message.layerMask = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseGetComboDetailsRequest() {
    return { comboId: 0 };
}
const GetComboDetailsRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.comboId !== 0) writer.uint32(8).uint32(message.comboId);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseGetComboDetailsRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.comboId = reader.uint32();
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseSetComboRequest() {
    return {
        comboId: 0,
        name: "",
        keyPositions: [],
        binding: undefined,
        timeoutMs: 0,
        requirePriorIdleMs: 0,
        slowRelease: false,
        layerMask: 0,
    };
}
const SetComboRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.comboId !== 0) writer.uint32(8).uint32(message.comboId);
        if (message.name !== "") writer.uint32(18).string(message.name);
        writer.uint32(26).fork();
        for (const keyPosition of message.keyPositions) {
            writer.int32(keyPosition);
        }
        writer.ldelim();
        if (message.binding !== undefined) {
            BehaviorBinding.encode(message.binding, writer.uint32(34).fork()).ldelim();
        }
        if (message.timeoutMs !== 0) writer.uint32(40).int32(message.timeoutMs);
        if (message.requirePriorIdleMs !== 0) writer.uint32(48).int32(message.requirePriorIdleMs);
        if (message.slowRelease === true) writer.uint32(56).bool(message.slowRelease);
        if (message.layerMask !== 0) writer.uint32(64).uint32(message.layerMask);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseSetComboRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.comboId = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
                    continue;
                case 3:
                    if ((tag & 7) === 2) {
                        const limit = reader.uint32() + reader.pos;
                        while (reader.pos < limit) {
                            message.keyPositions.push(reader.int32());
                        }
                    } else {
                        message.keyPositions.push(reader.int32());
                    }
                    continue;
                case 4:
                    message.binding = BehaviorBinding.decode(reader, reader.uint32());
                    continue;
                case 5:
                    message.timeoutMs = reader.int32();
                    continue;
                case 6:
                    message.requirePriorIdleMs = reader.int32();
                    continue;
                case 7:
                    message.slowRelease = reader.bool();
                    continue;
                case 8:
                    message.layerMask = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseDeleteComboRequest() {
    return { comboId: 0 };
}
const DeleteComboRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.comboId !== 0) writer.uint32(8).uint32(message.comboId);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseDeleteComboRequest();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.comboId = reader.uint32();
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
        listAllCombos: false,
        getComboDetails: undefined,
        setCombo: undefined,
        createCombo: false,
        deleteCombo: undefined,
        saveChanges: false,
        discardChanges: false,
        checkUnsavedChanges: false,
    };
}
export const Request = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.listAllCombos === true) writer.uint32(8).bool(message.listAllCombos);
        if (message.getComboDetails !== undefined) {
            GetComboDetailsRequest.encode(message.getComboDetails, writer.uint32(18).fork()).ldelim();
        }
        if (message.setCombo !== undefined) {
            SetComboRequest.encode(message.setCombo, writer.uint32(26).fork()).ldelim();
        }
        if (message.createCombo === true) writer.uint32(32).bool(message.createCombo);
        if (message.deleteCombo !== undefined) {
            DeleteComboRequest.encode(message.deleteCombo, writer.uint32(42).fork()).ldelim();
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
                    message.listAllCombos = reader.bool();
                    continue;
                case 2:
                    message.getComboDetails = GetComboDetailsRequest.decode(reader, reader.uint32());
                    continue;
                case 3:
                    message.setCombo = SetComboRequest.decode(reader, reader.uint32());
                    continue;
                case 4:
                    message.createCombo = reader.bool();
                    continue;
                case 5:
                    message.deleteCombo = DeleteComboRequest.decode(reader, reader.uint32());
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

function createBaseListAllCombosResponse() {
    return { combos: [] };
}
const ListAllCombosResponse = {
    encode(message, writer = _m0.Writer.create()) {
        for (const combo of message.combos) {
            ComboSummary.encode(combo, writer.uint32(10).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseListAllCombosResponse();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.combos.push(ComboSummary.decode(reader, reader.uint32()));
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseCreateComboResponse() {
    return { ok: undefined, err: undefined };
}
const CreateComboResponse = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.ok !== undefined) writer.uint32(8).uint32(message.ok);
        if (message.err !== undefined) writer.uint32(16).bool(message.err);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseCreateComboResponse();
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
        listAllCombos: undefined,
        getComboDetails: undefined,
        setCombo: 0,
        createCombo: undefined,
        deleteCombo: false,
        saveChanges: 0,
        discardChanges: false,
        checkUnsavedChanges: false,
    };
}
export const Response = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.listAllCombos !== undefined) {
            ListAllCombosResponse.encode(message.listAllCombos, writer.uint32(10).fork()).ldelim();
        }
        if (message.getComboDetails !== undefined) {
            ComboDetails.encode(message.getComboDetails, writer.uint32(18).fork()).ldelim();
        }
        if (message.setCombo !== 0) writer.uint32(24).int32(message.setCombo);
        if (message.createCombo !== undefined) {
            CreateComboResponse.encode(message.createCombo, writer.uint32(34).fork()).ldelim();
        }
        if (message.deleteCombo === true) writer.uint32(40).bool(message.deleteCombo);
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
                    message.listAllCombos = ListAllCombosResponse.decode(reader, reader.uint32());
                    continue;
                case 2:
                    message.getComboDetails = ComboDetails.decode(reader, reader.uint32());
                    continue;
                case 3:
                    message.setCombo = reader.int32();
                    continue;
                case 4:
                    message.createCombo = CreateComboResponse.decode(reader, reader.uint32());
                    continue;
                case 5:
                    message.deleteCombo = reader.bool();
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
