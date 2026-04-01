import * as _m0 from "protobufjs/minimal";

function createBaseTrackpadConfig() {
    return {
        enabled: false,
        sensitivity: 0,
        scrollDirection: "",
        scrollSpeed: 0,
        pollingIntervalMs: 0,
        precisionModeEnabled: false,
        scrollModeSwitch: "",
        scrollProfile: 0,
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
        if (message.scrollModeSwitch !== "") writer.uint32(58).string(message.scrollModeSwitch);
        if (message.scrollProfile !== 0) writer.uint32(64).uint32(message.scrollProfile);
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
                case 7:
                    message.scrollModeSwitch = reader.string();
                    continue;
                case 8:
                    message.scrollProfile = reader.uint32();
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
        backlightIdleTimeoutMs: 0,
        rgbEnabled: false,
        rgbBrightness: 0,
        rgbColor: "",
        rgbAutoOff: false,
        rgbIdleTimeoutMs: 0,
        trackpadLedEnabled: false,
        trackpadLedBrightness: 0,
    };
}
const BacklightConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.backlightEnabled === true) writer.uint32(8).bool(message.backlightEnabled);
        if (message.backlightBrightness !== 0) writer.uint32(16).uint32(message.backlightBrightness);
        if (message.backlightAutoOff === true) writer.uint32(24).bool(message.backlightAutoOff);
        if (message.backlightIdleTimeoutMs !== 0) writer.uint32(32).uint32(message.backlightIdleTimeoutMs);
        if (message.rgbEnabled === true) writer.uint32(40).bool(message.rgbEnabled);
        if (message.rgbBrightness !== 0) writer.uint32(48).uint32(message.rgbBrightness);
        if (message.rgbColor !== "") writer.uint32(58).string(message.rgbColor);
        if (message.trackpadLedEnabled === true) writer.uint32(64).bool(message.trackpadLedEnabled);
        if (message.trackpadLedBrightness !== 0) writer.uint32(72).uint32(message.trackpadLedBrightness);
        if (message.rgbAutoOff === true) writer.uint32(80).bool(message.rgbAutoOff);
        if (message.rgbIdleTimeoutMs !== 0) writer.uint32(88).uint32(message.rgbIdleTimeoutMs);
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
                    message.backlightIdleTimeoutMs = reader.uint32();
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
                case 10:
                    message.rgbAutoOff = reader.bool();
                    continue;
                case 11:
                    message.rgbIdleTimeoutMs = reader.uint32();
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
    return { outputMode: "", activeProfile: 0, profiles: [], txPowerBoost: false, activeOutputMode: 0 };
}
const BluetoothConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.outputMode !== "") writer.uint32(10).string(message.outputMode);
        if (message.activeProfile !== 0) writer.uint32(16).uint32(message.activeProfile);
        for (const profile of message.profiles) {
            BtProfile.encode(profile, writer.uint32(26).fork()).ldelim();
        }
        if (message.txPowerBoost === true) writer.uint32(32).bool(message.txPowerBoost);
        if (message.activeOutputMode !== 0) writer.uint32(40).uint32(message.activeOutputMode);
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
                case 5:
                    message.activeOutputMode = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBasePowerConfig() {
    return {
        batteryPercent: 0,
        usbPowered: false,
        extPowerEnabled: false,
        batteryReportIntervalS: 0,
        activityState: 0,
        chargingLedMode: 0,
        chargingLedSpeedMs: 0,
    };
}
const PowerConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.batteryPercent !== 0) writer.uint32(8).uint32(message.batteryPercent);
        if (message.usbPowered === true) writer.uint32(16).bool(message.usbPowered);
        if (message.extPowerEnabled === true) writer.uint32(24).bool(message.extPowerEnabled);
        if (message.batteryReportIntervalS !== 0) writer.uint32(32).uint32(message.batteryReportIntervalS);
        if (message.activityState !== 0) writer.uint32(40).uint32(message.activityState);
        if (message.chargingLedMode !== 0) writer.uint32(48).uint32(message.chargingLedMode);
        if (message.chargingLedSpeedMs !== 0) writer.uint32(56).uint32(message.chargingLedSpeedMs);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBasePowerConfig();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.batteryPercent = reader.uint32();
                    continue;
                case 2:
                    message.usbPowered = reader.bool();
                    continue;
                case 3:
                    message.extPowerEnabled = reader.bool();
                    continue;
                case 4:
                    message.batteryReportIntervalS = reader.uint32();
                    continue;
                case 5:
                    message.activityState = reader.uint32();
                    continue;
                case 6:
                    message.chargingLedMode = reader.uint32();
                    continue;
                case 7:
                    message.chargingLedSpeedMs = reader.uint32();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseSleepConfig() {
    return {
        idleEnabled: false,
        idleTimeoutMs: 0,
        sleepEnabled: false,
        sleepTimeoutMs: 0,
        sleepWhileUsbPowered: false,
    };
}
const SleepConfig = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.idleEnabled === true) writer.uint32(8).bool(message.idleEnabled);
        if (message.idleTimeoutMs !== 0) writer.uint32(16).uint32(message.idleTimeoutMs);
        if (message.sleepEnabled === true) writer.uint32(24).bool(message.sleepEnabled);
        if (message.sleepTimeoutMs !== 0) writer.uint32(32).uint32(message.sleepTimeoutMs);
        if (message.sleepWhileUsbPowered === true) writer.uint32(40).bool(message.sleepWhileUsbPowered);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseSleepConfig();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.idleEnabled = reader.bool();
                    continue;
                case 2:
                    message.idleTimeoutMs = reader.uint32();
                    continue;
                case 3:
                    message.sleepEnabled = reader.bool();
                    continue;
                case 4:
                    message.sleepTimeoutMs = reader.uint32();
                    continue;
                case 5:
                    message.sleepWhileUsbPowered = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseSubProfileSummary() {
    return { index: 0, name: "", active: false, initialized: false };
}
const SubProfileSummary = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.index !== 0) writer.uint32(8).uint32(message.index);
        if (message.name !== "") writer.uint32(18).string(message.name);
        if (message.active === true) writer.uint32(24).bool(message.active);
        if (message.initialized === true) writer.uint32(32).bool(message.initialized);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseSubProfileSummary();
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
                    message.active = reader.bool();
                    continue;
                case 4:
                    message.initialized = reader.bool();
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};

function createBaseSubProfileState() {
    return { activeProfile: 0, profiles: [], switching: false };
}
const SubProfileState = {
    encode(message, writer = _m0.Writer.create()) {
        if (message.activeProfile !== 0) writer.uint32(8).uint32(message.activeProfile);
        for (const profile of message.profiles) {
            SubProfileSummary.encode(profile, writer.uint32(18).fork()).ldelim();
        }
        if (message.switching === true) writer.uint32(24).bool(message.switching);
        return writer;
    },
    decode(input, length) {
        const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
        const message = createBaseSubProfileState();
        let end = length === undefined ? reader.len : reader.pos + length;
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.activeProfile = reader.uint32();
                    continue;
                case 2:
                    message.profiles.push(SubProfileSummary.decode(reader, reader.uint32()));
                    continue;
                case 3:
                    message.switching = reader.bool();
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
        getPowerConfig: false,
        setPowerConfig: undefined,
        getSleepConfig: false,
        setSleepConfig: undefined,
        selectBtProfile: undefined,
        clearBtProfile: undefined,
        renameBtProfile: undefined,
        powerOff: false,
        saveChanges: false,
        discardChanges: false,
        getSubprofileState: false,
        switchSubprofile: undefined,
        renameSubprofile: undefined,
        resetSubprofile: undefined,
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
        if (message.getPowerConfig === true) writer.uint32(96).bool(message.getPowerConfig);
        if (message.setPowerConfig !== undefined) {
            ConfigWrapper.encode(message.setPowerConfig, writer.uint32(106).fork(), PowerConfig.encode).ldelim();
        }
        if (message.getSleepConfig === true) writer.uint32(112).bool(message.getSleepConfig);
        if (message.setSleepConfig !== undefined) {
            ConfigWrapper.encode(message.setSleepConfig, writer.uint32(122).fork(), SleepConfig.encode).ldelim();
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
        if (message.powerOff === true) writer.uint32(128).bool(message.powerOff);
        if (message.saveChanges === true) writer.uint32(80).bool(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(88).bool(message.discardChanges);
        if (message.getSubprofileState === true) writer.uint32(136).bool(message.getSubprofileState);
        if (message.switchSubprofile !== undefined) {
            ProfileIndexRequest.encode(message.switchSubprofile, writer.uint32(146).fork()).ldelim();
        }
        if (message.renameSubprofile !== undefined) {
            RenameBtProfileRequest.encode(message.renameSubprofile, writer.uint32(154).fork()).ldelim();
        }
        if (message.resetSubprofile !== undefined) {
            ProfileIndexRequest.encode(message.resetSubprofile, writer.uint32(162).fork()).ldelim();
        }
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
                case 12:
                    message.getPowerConfig = reader.bool();
                    continue;
                case 13:
                    message.setPowerConfig = ConfigWrapper.decode(reader, reader.uint32(), PowerConfig.decode);
                    continue;
                case 14:
                    message.getSleepConfig = reader.bool();
                    continue;
                case 15:
                    message.setSleepConfig = ConfigWrapper.decode(reader, reader.uint32(), SleepConfig.decode);
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
                case 16:
                    message.powerOff = reader.bool();
                    continue;
                case 10:
                    message.saveChanges = reader.bool();
                    continue;
                case 11:
                    message.discardChanges = reader.bool();
                    continue;
                case 17:
                    message.getSubprofileState = reader.bool();
                    continue;
                case 18:
                    message.switchSubprofile = ProfileIndexRequest.decode(reader, reader.uint32());
                    continue;
                case 19:
                    message.renameSubprofile = RenameBtProfileRequest.decode(reader, reader.uint32());
                    continue;
                case 20:
                    message.resetSubprofile = ProfileIndexRequest.decode(reader, reader.uint32());
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
        getPowerConfig: undefined,
        setPowerConfig: 0,
        getSleepConfig: undefined,
        setSleepConfig: 0,
        selectBtProfile: false,
        clearBtProfile: false,
        renameBtProfile: false,
        powerOff: false,
        saveChanges: 0,
        discardChanges: false,
        getSubprofileState: undefined,
        switchSubprofile: 0,
        renameSubprofile: false,
        resetSubprofile: false,
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
        if (message.getPowerConfig !== undefined) {
            PowerConfig.encode(message.getPowerConfig, writer.uint32(98).fork()).ldelim();
        }
        if (message.setPowerConfig !== 0) writer.uint32(104).int32(message.setPowerConfig);
        if (message.getSleepConfig !== undefined) {
            SleepConfig.encode(message.getSleepConfig, writer.uint32(114).fork()).ldelim();
        }
        if (message.setSleepConfig !== 0) writer.uint32(120).int32(message.setSleepConfig);
        if (message.selectBtProfile === true) writer.uint32(56).bool(message.selectBtProfile);
        if (message.clearBtProfile === true) writer.uint32(64).bool(message.clearBtProfile);
        if (message.renameBtProfile === true) writer.uint32(72).bool(message.renameBtProfile);
        if (message.powerOff === true) writer.uint32(128).bool(message.powerOff);
        if (message.saveChanges !== 0) writer.uint32(80).int32(message.saveChanges);
        if (message.discardChanges === true) writer.uint32(88).bool(message.discardChanges);
        if (message.getSubprofileState !== undefined) {
            SubProfileState.encode(message.getSubprofileState, writer.uint32(138).fork()).ldelim();
        }
        if (message.switchSubprofile !== 0) writer.uint32(144).int32(message.switchSubprofile);
        if (message.renameSubprofile === true) writer.uint32(152).bool(message.renameSubprofile);
        if (message.resetSubprofile === true) writer.uint32(160).bool(message.resetSubprofile);
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
                case 12:
                    message.getPowerConfig = PowerConfig.decode(reader, reader.uint32());
                    continue;
                case 13:
                    message.setPowerConfig = reader.int32();
                    continue;
                case 14:
                    message.getSleepConfig = SleepConfig.decode(reader, reader.uint32());
                    continue;
                case 15:
                    message.setSleepConfig = reader.int32();
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
                case 16:
                    message.powerOff = reader.bool();
                    continue;
                case 10:
                    message.saveChanges = reader.int32();
                    continue;
                case 11:
                    message.discardChanges = reader.bool();
                    continue;
                case 17:
                    message.getSubprofileState = SubProfileState.decode(reader, reader.uint32());
                    continue;
                case 18:
                    message.switchSubprofile = reader.int32();
                    continue;
                case 19:
                    message.renameSubprofile = reader.bool();
                    continue;
                case 20:
                    message.resetSubprofile = reader.bool();
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
        powerConfigChanged: undefined,
        sleepConfigChanged: undefined,
        subprofileStateChanged: undefined,
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
        if (message.powerConfigChanged !== undefined) {
            PowerConfig.encode(message.powerConfigChanged, writer.uint32(34).fork()).ldelim();
        }
        if (message.sleepConfigChanged !== undefined) {
            SleepConfig.encode(message.sleepConfigChanged, writer.uint32(42).fork()).ldelim();
        }
        if (message.subprofileStateChanged !== undefined) {
            SubProfileState.encode(message.subprofileStateChanged, writer.uint32(50).fork()).ldelim();
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
                case 4:
                    message.powerConfigChanged = PowerConfig.decode(reader, reader.uint32());
                    continue;
                case 5:
                    message.sleepConfigChanged = SleepConfig.decode(reader, reader.uint32());
                    continue;
                case 6:
                    message.subprofileStateChanged = SubProfileState.decode(reader, reader.uint32());
                    continue;
            }
            if ((tag & 7) === 4 || tag === 0) break;
            reader.skipType(tag & 7);
        }
        return message;
    },
};
