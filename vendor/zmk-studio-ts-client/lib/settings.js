import * as _m0 from "protobufjs/minimal";

function createBaseTrackpadConfig() {
    return {
        enabled: false,
        sensitivity: 0,
        scrollDirection: "",
        scrollSpeed: 0,
        pollingIntervalMs: 0,
        precisionModeEnabled: false,
    };
}
const TrackpadConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.enabled === true) writer.uint32(8).bool(message.enabled);
        if (message.sensitivity !== 0) writer.uint32(16).uint32(message.sensitivity);
        if (message.scrollDirection !== "") writer.uint32(26).string(message.scrollDirection);
        if (message.scrollSpeed !== 0) writer.uint32(32).uint32(message.scrollSpeed);
        if (message.pollingIntervalMs !== 0) writer.uint32(40).uint32(message.pollingIntervalMs);
        if (message.precisionModeEnabled === true) writer.uint32(48).bool(message.precisionModeEnabled);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseTrackpadConfig();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.enabled = reader.bool();
                    continue;
                case 2:
                    message.sensitivity = reader.uint32();
                    continue;
                case 3:
                    message.scrollDirection = reader.string();
                    continue;
                case 4:
                    message.scrollSpeed = reader.uint32();
                    continue;
                case 5:
                    message.pollingIntervalMs = reader.uint32();
                    continue;
                case 6:
                    message.precisionModeEnabled = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseBacklightConfig() {
    return {
        backlightEnabled: false,
        backlightBrightness: 0,
        backlightAutoOff: false,
        idleTimeoutMs: 0,
        rgbEnabled: false,
        rgbBrightness: 0,
        rgbColor: "",
        trackpadLedEnabled: false,
        trackpadLedBrightness: 0,
    };
}
const BacklightConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.backlightEnabled === true) writer.uint32(8).bool(message.backlightEnabled);
        if (message.backlightBrightness !== 0) writer.uint32(16).uint32(message.backlightBrightness);
        if (message.backlightAutoOff === true) writer.uint32(24).bool(message.backlightAutoOff);
        if (message.idleTimeoutMs !== 0) writer.uint32(32).uint32(message.idleTimeoutMs);
        if (message.rgbEnabled === true) writer.uint32(40).bool(message.rgbEnabled);
        if (message.rgbBrightness !== 0) writer.uint32(48).uint32(message.rgbBrightness);
        if (message.rgbColor !== "") writer.uint32(58).string(message.rgbColor);
        if (message.trackpadLedEnabled === true) writer.uint32(64).bool(message.trackpadLedEnabled);
        if (message.trackpadLedBrightness !== 0) writer.uint32(72).uint32(message.trackpadLedBrightness);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseBacklightConfig();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.backlightEnabled = reader.bool();
                    continue;
                case 2:
                    message.backlightBrightness = reader.uint32();
                    continue;
                case 3:
                    message.backlightAutoOff = reader.bool();
                    continue;
                case 4:
                    message.idleTimeoutMs = reader.uint32();
                    continue;
                case 5:
                    message.rgbEnabled = reader.bool();
                    continue;
                case 6:
                    message.rgbBrightness = reader.uint32();
                    continue;
                case 7:
                    message.rgbColor = reader.string();
                    continue;
                case 8:
                    message.trackpadLedEnabled = reader.bool();
                    continue;
                case 9:
                    message.trackpadLedBrightness = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseBtProfile() {
    return { index: 0, name: "", connected: false, paired: false };
}
const BtProfile = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.index !== 0) writer.uint32(8).uint32(message.index);
        if (message.name !== "") writer.uint32(18).string(message.name);
        if (message.connected === true) writer.uint32(24).bool(message.connected);
        if (message.paired === true) writer.uint32(32).bool(message.paired);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseBtProfile();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.index = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
                    continue;
                case 3:
                    message.connected = reader.bool();
                    continue;
                case 4:
                    message.paired = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseBluetoothConfig() {
    return { outputMode: "", activeProfile: 0, profiles: [], txPowerBoost: false };
}
const BluetoothConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.outputMode !== "") writer.uint32(10).string(message.outputMode);
        if (message.activeProfile !== 0) writer.uint32(16).uint32(message.activeProfile);
        for (const profile of message.profiles) {
            BtProfile.encode(profile, writer.uint32(26).fork()).ldelim();
        }
        if (message.txPowerBoost === true) writer.uint32(32).bool(message.txPowerBoost);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseBluetoothConfig();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.outputMode = reader.string();
                    continue;
                case 2:
                    message.activeProfile = reader.uint32();
                    continue;
                case 3:
                    message.profiles.push(BtProfile.decode(reader, reader.uint32()));
                    continue;
                case 4:
                    message.txPowerBoost = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

const ConfigWrapper = {
    encode(message, writer = _m0.Writer.create(), encoder) {
        if (message.config !== undefined) encoder(message.config, writer.uint32(10).fork()).ldelim();
        return writer;
    },
    decode(input, length, decoder) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = { config: undefined };
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.config = decoder(reader, reader.uint32());
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

const ProfileIndexRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.profileIndex !== 0) writer.uint32(8).uint32(message.profileIndex);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = { profileIndex: 0 };
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            if (tag >>> 3 === 1) {
                message.profileIndex = reader.uint32();
                continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

const RenameBtProfileRequest = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.profileIndex !== 0) writer.uint32(8).uint32(message.profileIndex);
        if (message.name !== "") writer.uint32(18).string(message.name);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = { profileIndex: 0, name: "" };
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.profileIndex = reader.uint32();
                    continue;
                case 2:
                    message.name = reader.string();
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
        getTrackpadConfig: false,
        setTrackpadConfig: undefined,
        getBacklightConfig: false,
        setBacklightConfig: undefined,
        getBluetoothConfig: false,
        setBluetoothConfig: undefined,
        selectBtProfile: undefined,
        clearBtProfile: undefined,
        renameBtProfile: undefined,
        saveChanges: false,
        discardChanges: false,
    };
}
export const Request = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.getTrackpadConfig === true) writer.uint32(8).bool(message.getTrackpadConfig);
        if (message.setTrackpadConfig !== undefined) {
            ConfigWrapper.encode(message.setTrackpadConfig, writer.uint32(18).fork(), TrackpadConfig.encode).ldelim();
        }
        if (message.getBacklightConfig === true) writer.uint32(24).bool(message.getBacklightConfig);
        if (message.setBacklightConfig !== undefined) {
            ConfigWrapper.encode(message.setBacklightConfig, writer.uint32(34).fork(), BacklightConfig.encode).ldelim();
        }
        if (message.getBluetoothConfig === true) writer.uint32(40).bool(message.getBluetoothConfig);
        if (message.setBluetoothConfig !== undefined) {
            ConfigWrapper.encode(message.setBluetoothConfig, writer.uint32(50).fork(), BluetoothConfig.encode).ldelim();
        }
        if (message.selectBtProfile !== undefined) {
            ProfileIndexRequest.encode(message.selectBtProfile, writer.uint32(58).fork()).ldelim();
        }
        if (message.clearBtProfile !== undefined) {
            ProfileIndexRequest.encode(message.clearBtProfile, writer.uint32(66).fork()).ldelim();
        }
        if (message.renameBtProfile !== undefined) {
            RenameBtProfileRequest.encode(message.renameBtProfile, writer.uint32(74).fork()).ldelim();
        }
        if (message.saveChanges === true) writer.uint32(80).bool(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(88).bool(message.discardChanges);
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
                    message.getTrackpadConfig = reader.bool();
                    continue;
                case 2:
                    message.setTrackpadConfig = ConfigWrapper.decode(reader, reader.uint32(), TrackpadConfig.decode);
                    continue;
                case 3:
                    message.getBacklightConfig = reader.bool();
                    continue;
                case 4:
                    message.setBacklightConfig = ConfigWrapper.decode(reader, reader.uint32(), BacklightConfig.decode);
                    continue;
                case 5:
                    message.getBluetoothConfig = reader.bool();
                    continue;
                case 6:
                    message.setBluetoothConfig = ConfigWrapper.decode(reader, reader.uint32(), BluetoothConfig.decode);
                    continue;
                case 7:
                    message.selectBtProfile = ProfileIndexRequest.decode(reader, reader.uint32());
                    continue;
                case 8:
                    message.clearBtProfile = ProfileIndexRequest.decode(reader, reader.uint32());
                    continue;
                case 9:
                    message.renameBtProfile = RenameBtProfileRequest.decode(reader, reader.uint32());
                    continue;
                case 10:
                    message.saveChanges = reader.bool();
                    continue;
                case 11:
                    message.discardChanges = reader.bool();
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
        getTrackpadConfig: undefined,
        setTrackpadConfig: 0,
        getBacklightConfig: undefined,
        setBacklightConfig: 0,
        getBluetoothConfig: undefined,
        setBluetoothConfig: 0,
        selectBtProfile: false,
        clearBtProfile: false,
        renameBtProfile: false,
        saveChanges: 0,
        discardChanges: false,
    };
}
export const Response = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.getTrackpadConfig !== undefined) {
            TrackpadConfig.encode(message.getTrackpadConfig, writer.uint32(10).fork()).ldelim();
        }
        if (message.setTrackpadConfig !== 0) writer.uint32(16).int32(message.setTrackpadConfig);
        if (message.getBacklightConfig !== undefined) {
            BacklightConfig.encode(message.getBacklightConfig, writer.uint32(26).fork()).ldelim();
        }
        if (message.setBacklightConfig !== 0) writer.uint32(32).int32(message.setBacklightConfig);
        if (message.getBluetoothConfig !== undefined) {
            BluetoothConfig.encode(message.getBluetoothConfig, writer.uint32(42).fork()).ldelim();
        }
        if (message.setBluetoothConfig !== 0) writer.uint32(48).int32(message.setBluetoothConfig);
        if (message.selectBtProfile === true) writer.uint32(56).bool(message.selectBtProfile);
        if (message.clearBtProfile === true) writer.uint32(64).bool(message.clearBtProfile);
        if (message.renameBtProfile === true) writer.uint32(72).bool(message.renameBtProfile);
        if (message.saveChanges !== 0) writer.uint32(80).int32(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(88).bool(message.discardChanges);
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
                    message.getTrackpadConfig = TrackpadConfig.decode(reader, reader.uint32());
                    continue;
                case 2:
                    message.setTrackpadConfig = reader.int32();
                    continue;
                case 3:
                    message.getBacklightConfig = BacklightConfig.decode(reader, reader.uint32());
                    continue;
                case 4:
                    message.setBacklightConfig = reader.int32();
                    continue;
                case 5:
                    message.getBluetoothConfig = BluetoothConfig.decode(reader, reader.uint32());
                    continue;
                case 6:
                    message.setBluetoothConfig = reader.int32();
                    continue;
                case 7:
                    message.selectBtProfile = reader.bool();
                    continue;
                case 8:
                    message.clearBtProfile = reader.bool();
                    continue;
                case 9:
                    message.renameBtProfile = reader.bool();
                    continue;
                case 10:
                    message.saveChanges = reader.int32();
                    continue;
                case 11:
                    message.discardChanges = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseNotification() {
    return {
        trackpadConfigChanged: undefined,
        backlightConfigChanged: undefined,
        bluetoothConfigChanged: undefined,
    };
}
export const Notification = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.trackpadConfigChanged !== undefined) {
            TrackpadConfig.encode(message.trackpadConfigChanged, writer.uint32(10).fork()).ldelim();
        }
        if (message.backlightConfigChanged !== undefined) {
            BacklightConfig.encode(message.backlightConfigChanged, writer.uint32(18).fork()).ldelim();
        }
        if (message.bluetoothConfigChanged !== undefined) {
            BluetoothConfig.encode(message.bluetoothConfigChanged, writer.uint32(26).fork()).ldelim();
        }
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseNotification();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.trackpadConfigChanged = TrackpadConfig.decode(reader, reader.uint32());
                    continue;
                case 2:
                    message.backlightConfigChanged = BacklightConfig.decode(reader, reader.uint32());
                    continue;
                case 3:
                    message.bluetoothConfigChanged = BluetoothConfig.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};
