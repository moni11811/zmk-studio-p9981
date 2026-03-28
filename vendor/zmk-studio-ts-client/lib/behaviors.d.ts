import * as _m0 from "protobufjs/minimal";
import { BehaviorBinding } from "./keymap";
export declare const protobufPackage = "zmk.behaviors";
export declare enum HoldTapFlavor {
    HOLD_TAP_FLAVOR_HOLD_PREFERRED = 0,
    HOLD_TAP_FLAVOR_BALANCED = 1,
    HOLD_TAP_FLAVOR_TAP_PREFERRED = 2,
    HOLD_TAP_FLAVOR_TAP_UNLESS_INTERRUPTED = 3,
    UNRECOGNIZED = -1
}
export declare function holdTapFlavorFromJSON(object: any): HoldTapFlavor;
export declare function holdTapFlavorToJSON(object: HoldTapFlavor): string;
export declare enum SetBehaviorRuntimeConfigResponseCode {
    SET_BEHAVIOR_RUNTIME_CONFIG_OK = 0,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_ID = 1,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_CONFIG = 2,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_INVALID_BINDING = 3,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_OUT_OF_RANGE = 4,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_NOT_SUPPORTED = 5,
    SET_BEHAVIOR_RUNTIME_CONFIG_ERR_PERSIST = 6,
    UNRECOGNIZED = -1
}
export declare function setBehaviorRuntimeConfigResponseCodeFromJSON(object: any): SetBehaviorRuntimeConfigResponseCode;
export declare function setBehaviorRuntimeConfigResponseCodeToJSON(object: SetBehaviorRuntimeConfigResponseCode): string;
export interface Request {
    listAllBehaviors?: boolean | undefined;
    getBehaviorDetails?: GetBehaviorDetailsRequest | undefined;
    getBehaviorRuntimeConfig?: GetBehaviorRuntimeConfigRequest | undefined;
    setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigRequest | undefined;
}
export interface GetBehaviorDetailsRequest {
    behaviorId: number;
}
export interface GetBehaviorRuntimeConfigRequest {
    behaviorId: number;
}
export interface HoldTapRuntimeConfig {
    tappingTermMs: number;
    quickTapMs: number;
    requirePriorIdleMs: number;
    flavor: HoldTapFlavor;
    holdBehaviorId: number;
    tapBehaviorId: number;
}
export interface TapDanceRuntimeConfig {
    tappingTermMs: number;
    bindings: BehaviorBinding[];
}
export interface StickyKeyRuntimeConfig {
    releaseAfterMs: number;
    quickRelease: boolean;
    lazy: boolean;
    ignoreModifiers: boolean;
    behaviorId: number;
}
export interface BehaviorRuntimeConfig {
    behaviorId: number;
    holdTap?: HoldTapRuntimeConfig | undefined;
    tapDance?: TapDanceRuntimeConfig | undefined;
    stickyKey?: StickyKeyRuntimeConfig | undefined;
}
export interface SetBehaviorRuntimeConfigRequest {
    config: BehaviorRuntimeConfig | undefined;
}
export interface Response {
    listAllBehaviors?: ListAllBehaviorsResponse | undefined;
    getBehaviorDetails?: GetBehaviorDetailsResponse | undefined;
    getBehaviorRuntimeConfig?: BehaviorRuntimeConfig | undefined;
    setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigResponseCode | undefined;
}
export interface ListAllBehaviorsResponse {
    behaviors: number[];
}
export interface GetBehaviorDetailsResponse {
    id: number;
    displayName: string;
    metadata: BehaviorBindingParametersSet[];
}
export interface BehaviorBindingParametersSet {
    param1: BehaviorParameterValueDescription[];
    param2: BehaviorParameterValueDescription[];
}
export interface BehaviorParameterValueDescriptionRange {
    min: number;
    max: number;
}
export interface BehaviorParameterNil {
}
export interface BehaviorParameterLayerId {
}
export interface BehaviorParameterHidUsage {
    keyboardMax: number;
    consumerMax: number;
}
export interface BehaviorParameterValueDescription {
    name: string;
    nil?: BehaviorParameterNil | undefined;
    constant?: number | undefined;
    range?: BehaviorParameterValueDescriptionRange | undefined;
    hidUsage?: BehaviorParameterHidUsage | undefined;
    layerId?: BehaviorParameterLayerId | undefined;
}
export declare const Request: {
    encode(message: Request, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Request;
    fromJSON(object: any): Request;
    toJSON(message: Request): unknown;
    create<I extends {
        listAllBehaviors?: boolean | undefined;
        getBehaviorDetails?: {
            behaviorId?: number;
        };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
        };
        setBehaviorRuntimeConfig?: {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            };
        };
    } & {
        listAllBehaviors?: boolean | undefined;
        getBehaviorDetails?: {
            behaviorId?: number;
        } & {
            behaviorId?: number;
        } & { [K in Exclude<keyof I["getBehaviorDetails"], "behaviorId">]: never; };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
        } & {
            behaviorId?: number;
        } & { [K_1 in Exclude<keyof I["getBehaviorRuntimeConfig"], "behaviorId">]: never; };
        setBehaviorRuntimeConfig?: {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            };
        } & {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            } & {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                } & {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                } & { [K_2 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                } & {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[] & ({
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    } & {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    } & { [K_3 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_4 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"]["tapDance"]["bindings"], keyof {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[]>]: never; };
                } & { [K_5 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                } & {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                } & { [K_6 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
            } & { [K_7 in Exclude<keyof I["setBehaviorRuntimeConfig"]["config"], keyof BehaviorRuntimeConfig>]: never; };
        } & { [K_8 in Exclude<keyof I["setBehaviorRuntimeConfig"], "config">]: never; };
    } & { [K_9 in Exclude<keyof I, keyof Request>]: never; }>(base?: I): Request;
    fromPartial<I_1 extends {
        listAllBehaviors?: boolean | undefined;
        getBehaviorDetails?: {
            behaviorId?: number;
        };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
        };
        setBehaviorRuntimeConfig?: {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            };
        };
    } & {
        listAllBehaviors?: boolean | undefined;
        getBehaviorDetails?: {
            behaviorId?: number;
        } & {
            behaviorId?: number;
        } & { [K_10 in Exclude<keyof I_1["getBehaviorDetails"], "behaviorId">]: never; };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
        } & {
            behaviorId?: number;
        } & { [K_11 in Exclude<keyof I_1["getBehaviorRuntimeConfig"], "behaviorId">]: never; };
        setBehaviorRuntimeConfig?: {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            };
        } & {
            config?: {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                };
            } & {
                behaviorId?: number;
                holdTap?: {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                } & {
                    tappingTermMs?: number;
                    quickTapMs?: number;
                    requirePriorIdleMs?: number;
                    flavor?: HoldTapFlavor;
                    holdBehaviorId?: number;
                    tapBehaviorId?: number;
                } & { [K_12 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
                tapDance?: {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[];
                } & {
                    tappingTermMs?: number;
                    bindings?: {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[] & ({
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    } & {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    } & { [K_13 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_14 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"]["tapDance"]["bindings"], keyof {
                        behaviorId?: number;
                        param1?: number;
                        param2?: number;
                    }[]>]: never; };
                } & { [K_15 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
                stickyKey?: {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                } & {
                    releaseAfterMs?: number;
                    quickRelease?: boolean;
                    lazy?: boolean;
                    ignoreModifiers?: boolean;
                    behaviorId?: number;
                } & { [K_16 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
            } & { [K_17 in Exclude<keyof I_1["setBehaviorRuntimeConfig"]["config"], keyof BehaviorRuntimeConfig>]: never; };
        } & { [K_18 in Exclude<keyof I_1["setBehaviorRuntimeConfig"], "config">]: never; };
    } & { [K_19 in Exclude<keyof I_1, keyof Request>]: never; }>(object: I_1): Request;
};
export declare const GetBehaviorDetailsRequest: {
    encode(message: GetBehaviorDetailsRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GetBehaviorDetailsRequest;
    fromJSON(object: any): GetBehaviorDetailsRequest;
    toJSON(message: GetBehaviorDetailsRequest): unknown;
    create<I extends {
        behaviorId?: number;
    } & {
        behaviorId?: number;
    } & { [K in Exclude<keyof I, "behaviorId">]: never; }>(base?: I): GetBehaviorDetailsRequest;
    fromPartial<I_1 extends {
        behaviorId?: number;
    } & {
        behaviorId?: number;
    } & { [K_1 in Exclude<keyof I_1, "behaviorId">]: never; }>(object: I_1): GetBehaviorDetailsRequest;
};
export declare const GetBehaviorRuntimeConfigRequest: {
    encode(message: GetBehaviorRuntimeConfigRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GetBehaviorRuntimeConfigRequest;
    fromJSON(object: any): GetBehaviorRuntimeConfigRequest;
    toJSON(message: GetBehaviorRuntimeConfigRequest): unknown;
    create<I extends {
        behaviorId?: number;
    } & {
        behaviorId?: number;
    } & { [K in Exclude<keyof I, "behaviorId">]: never; }>(base?: I): GetBehaviorRuntimeConfigRequest;
    fromPartial<I_1 extends {
        behaviorId?: number;
    } & {
        behaviorId?: number;
    } & { [K_1 in Exclude<keyof I_1, "behaviorId">]: never; }>(object: I_1): GetBehaviorRuntimeConfigRequest;
};
export declare const HoldTapRuntimeConfig: {
    encode(message: HoldTapRuntimeConfig, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): HoldTapRuntimeConfig;
    fromJSON(object: any): HoldTapRuntimeConfig;
    toJSON(message: HoldTapRuntimeConfig): unknown;
    create<I extends {
        tappingTermMs?: number;
        quickTapMs?: number;
        requirePriorIdleMs?: number;
        flavor?: HoldTapFlavor;
        holdBehaviorId?: number;
        tapBehaviorId?: number;
    } & {
        tappingTermMs?: number;
        quickTapMs?: number;
        requirePriorIdleMs?: number;
        flavor?: HoldTapFlavor;
        holdBehaviorId?: number;
        tapBehaviorId?: number;
    } & { [K in Exclude<keyof I, keyof HoldTapRuntimeConfig>]: never; }>(base?: I): HoldTapRuntimeConfig;
    fromPartial<I_1 extends {
        tappingTermMs?: number;
        quickTapMs?: number;
        requirePriorIdleMs?: number;
        flavor?: HoldTapFlavor;
        holdBehaviorId?: number;
        tapBehaviorId?: number;
    } & {
        tappingTermMs?: number;
        quickTapMs?: number;
        requirePriorIdleMs?: number;
        flavor?: HoldTapFlavor;
        holdBehaviorId?: number;
        tapBehaviorId?: number;
    } & { [K_1 in Exclude<keyof I_1, keyof HoldTapRuntimeConfig>]: never; }>(object: I_1): HoldTapRuntimeConfig;
};
export declare const TapDanceRuntimeConfig: {
    encode(message: TapDanceRuntimeConfig, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): TapDanceRuntimeConfig;
    fromJSON(object: any): TapDanceRuntimeConfig;
    toJSON(message: TapDanceRuntimeConfig): unknown;
    create<I extends {
        tappingTermMs?: number;
        bindings?: {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[];
    } & {
        tappingTermMs?: number;
        bindings?: {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[] & ({
            behaviorId?: number;
            param1?: number;
            param2?: number;
        } & {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        } & { [K in Exclude<keyof I["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_1 in Exclude<keyof I["bindings"], keyof {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[]>]: never; };
    } & { [K_2 in Exclude<keyof I, keyof TapDanceRuntimeConfig>]: never; }>(base?: I): TapDanceRuntimeConfig;
    fromPartial<I_1 extends {
        tappingTermMs?: number;
        bindings?: {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[];
    } & {
        tappingTermMs?: number;
        bindings?: {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[] & ({
            behaviorId?: number;
            param1?: number;
            param2?: number;
        } & {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        } & { [K_3 in Exclude<keyof I_1["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_4 in Exclude<keyof I_1["bindings"], keyof {
            behaviorId?: number;
            param1?: number;
            param2?: number;
        }[]>]: never; };
    } & { [K_5 in Exclude<keyof I_1, keyof TapDanceRuntimeConfig>]: never; }>(object: I_1): TapDanceRuntimeConfig;
};
export declare const StickyKeyRuntimeConfig: {
    encode(message: StickyKeyRuntimeConfig, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): StickyKeyRuntimeConfig;
    fromJSON(object: any): StickyKeyRuntimeConfig;
    toJSON(message: StickyKeyRuntimeConfig): unknown;
    create<I extends {
        releaseAfterMs?: number;
        quickRelease?: boolean;
        lazy?: boolean;
        ignoreModifiers?: boolean;
        behaviorId?: number;
    } & {
        releaseAfterMs?: number;
        quickRelease?: boolean;
        lazy?: boolean;
        ignoreModifiers?: boolean;
        behaviorId?: number;
    } & { [K in Exclude<keyof I, keyof StickyKeyRuntimeConfig>]: never; }>(base?: I): StickyKeyRuntimeConfig;
    fromPartial<I_1 extends {
        releaseAfterMs?: number;
        quickRelease?: boolean;
        lazy?: boolean;
        ignoreModifiers?: boolean;
        behaviorId?: number;
    } & {
        releaseAfterMs?: number;
        quickRelease?: boolean;
        lazy?: boolean;
        ignoreModifiers?: boolean;
        behaviorId?: number;
    } & { [K_1 in Exclude<keyof I_1, keyof StickyKeyRuntimeConfig>]: never; }>(object: I_1): StickyKeyRuntimeConfig;
};
export declare const BehaviorRuntimeConfig: {
    encode(message: BehaviorRuntimeConfig, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorRuntimeConfig;
    fromJSON(object: any): BehaviorRuntimeConfig;
    toJSON(message: BehaviorRuntimeConfig): unknown;
    create<I extends {
        behaviorId?: number;
        holdTap?: {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        };
        tapDance?: {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[];
        };
        stickyKey?: {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        };
    } & {
        behaviorId?: number;
        holdTap?: {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        } & {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        } & { [K in Exclude<keyof I["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
        tapDance?: {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[];
        } & {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[] & ({
                behaviorId?: number;
                param1?: number;
                param2?: number;
            } & {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            } & { [K_1 in Exclude<keyof I["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_2 in Exclude<keyof I["tapDance"]["bindings"], keyof {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[]>]: never; };
        } & { [K_3 in Exclude<keyof I["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
        stickyKey?: {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        } & {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        } & { [K_4 in Exclude<keyof I["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
    } & { [K_5 in Exclude<keyof I, keyof BehaviorRuntimeConfig>]: never; }>(base?: I): BehaviorRuntimeConfig;
    fromPartial<I_1 extends {
        behaviorId?: number;
        holdTap?: {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        };
        tapDance?: {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[];
        };
        stickyKey?: {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        };
    } & {
        behaviorId?: number;
        holdTap?: {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        } & {
            tappingTermMs?: number;
            quickTapMs?: number;
            requirePriorIdleMs?: number;
            flavor?: HoldTapFlavor;
            holdBehaviorId?: number;
            tapBehaviorId?: number;
        } & { [K_6 in Exclude<keyof I_1["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
        tapDance?: {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[];
        } & {
            tappingTermMs?: number;
            bindings?: {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[] & ({
                behaviorId?: number;
                param1?: number;
                param2?: number;
            } & {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            } & { [K_7 in Exclude<keyof I_1["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_8 in Exclude<keyof I_1["tapDance"]["bindings"], keyof {
                behaviorId?: number;
                param1?: number;
                param2?: number;
            }[]>]: never; };
        } & { [K_9 in Exclude<keyof I_1["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
        stickyKey?: {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        } & {
            releaseAfterMs?: number;
            quickRelease?: boolean;
            lazy?: boolean;
            ignoreModifiers?: boolean;
            behaviorId?: number;
        } & { [K_10 in Exclude<keyof I_1["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
    } & { [K_11 in Exclude<keyof I_1, keyof BehaviorRuntimeConfig>]: never; }>(object: I_1): BehaviorRuntimeConfig;
};
export declare const SetBehaviorRuntimeConfigRequest: {
    encode(message: SetBehaviorRuntimeConfigRequest, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): SetBehaviorRuntimeConfigRequest;
    fromJSON(object: any): SetBehaviorRuntimeConfigRequest;
    toJSON(message: SetBehaviorRuntimeConfigRequest): unknown;
    create<I extends {
        config?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        };
    } & {
        config?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        } & {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & { [K in Exclude<keyof I["config"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            } & {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[] & ({
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & { [K_1 in Exclude<keyof I["config"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_2 in Exclude<keyof I["config"]["tapDance"]["bindings"], keyof {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[]>]: never; };
            } & { [K_3 in Exclude<keyof I["config"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & { [K_4 in Exclude<keyof I["config"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
        } & { [K_5 in Exclude<keyof I["config"], keyof BehaviorRuntimeConfig>]: never; };
    } & { [K_6 in Exclude<keyof I, "config">]: never; }>(base?: I): SetBehaviorRuntimeConfigRequest;
    fromPartial<I_1 extends {
        config?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        };
    } & {
        config?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        } & {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & { [K_7 in Exclude<keyof I_1["config"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            } & {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[] & ({
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & { [K_8 in Exclude<keyof I_1["config"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_9 in Exclude<keyof I_1["config"]["tapDance"]["bindings"], keyof {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[]>]: never; };
            } & { [K_10 in Exclude<keyof I_1["config"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & { [K_11 in Exclude<keyof I_1["config"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
        } & { [K_12 in Exclude<keyof I_1["config"], keyof BehaviorRuntimeConfig>]: never; };
    } & { [K_13 in Exclude<keyof I_1, "config">]: never; }>(object: I_1): SetBehaviorRuntimeConfigRequest;
};
export declare const Response: {
    encode(message: Response, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): Response;
    fromJSON(object: any): Response;
    toJSON(message: Response): unknown;
    create<I extends {
        listAllBehaviors?: {
            behaviors?: number[];
        };
        getBehaviorDetails?: {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[];
        };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        };
        setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigResponseCode | undefined;
    } & {
        listAllBehaviors?: {
            behaviors?: number[];
        } & {
            behaviors?: number[] & number[] & { [K in Exclude<keyof I["listAllBehaviors"]["behaviors"], keyof number[]>]: never; };
        } & { [K_1 in Exclude<keyof I["listAllBehaviors"], "behaviors">]: never; };
        getBehaviorDetails?: {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[];
        } & {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[] & ({
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            } & {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[] & ({
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                } & {
                    name?: string;
                    nil?: {} & {} & { [K_2 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"][number]["nil"], never>]: never; };
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    } & {
                        min?: number;
                        max?: number;
                    } & { [K_3 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & { [K_4 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                    layerId?: {} & {} & { [K_5 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"][number]["layerId"], never>]: never; };
                } & { [K_6 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_7 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param1"], keyof {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[]>]: never; };
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[] & ({
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                } & {
                    name?: string;
                    nil?: {} & {} & { [K_8 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"][number]["nil"], never>]: never; };
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    } & {
                        min?: number;
                        max?: number;
                    } & { [K_9 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & { [K_10 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                    layerId?: {} & {} & { [K_11 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"][number]["layerId"], never>]: never; };
                } & { [K_12 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_13 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number]["param2"], keyof {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[]>]: never; };
            } & { [K_14 in Exclude<keyof I["getBehaviorDetails"]["metadata"][number], keyof BehaviorBindingParametersSet>]: never; })[] & { [K_15 in Exclude<keyof I["getBehaviorDetails"]["metadata"], keyof {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[]>]: never; };
        } & { [K_16 in Exclude<keyof I["getBehaviorDetails"], keyof GetBehaviorDetailsResponse>]: never; };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        } & {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & { [K_17 in Exclude<keyof I["getBehaviorRuntimeConfig"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            } & {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[] & ({
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & { [K_18 in Exclude<keyof I["getBehaviorRuntimeConfig"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_19 in Exclude<keyof I["getBehaviorRuntimeConfig"]["tapDance"]["bindings"], keyof {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[]>]: never; };
            } & { [K_20 in Exclude<keyof I["getBehaviorRuntimeConfig"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & { [K_21 in Exclude<keyof I["getBehaviorRuntimeConfig"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
        } & { [K_22 in Exclude<keyof I["getBehaviorRuntimeConfig"], keyof BehaviorRuntimeConfig>]: never; };
        setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigResponseCode | undefined;
    } & { [K_23 in Exclude<keyof I, keyof Response>]: never; }>(base?: I): Response;
    fromPartial<I_1 extends {
        listAllBehaviors?: {
            behaviors?: number[];
        };
        getBehaviorDetails?: {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[];
        };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        };
        setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigResponseCode | undefined;
    } & {
        listAllBehaviors?: {
            behaviors?: number[];
        } & {
            behaviors?: number[] & number[] & { [K_24 in Exclude<keyof I_1["listAllBehaviors"]["behaviors"], keyof number[]>]: never; };
        } & { [K_25 in Exclude<keyof I_1["listAllBehaviors"], "behaviors">]: never; };
        getBehaviorDetails?: {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[];
        } & {
            id?: number;
            displayName?: string;
            metadata?: {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[] & ({
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            } & {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[] & ({
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                } & {
                    name?: string;
                    nil?: {} & {} & { [K_26 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"][number]["nil"], never>]: never; };
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    } & {
                        min?: number;
                        max?: number;
                    } & { [K_27 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & { [K_28 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                    layerId?: {} & {} & { [K_29 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"][number]["layerId"], never>]: never; };
                } & { [K_30 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_31 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param1"], keyof {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[]>]: never; };
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[] & ({
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                } & {
                    name?: string;
                    nil?: {} & {} & { [K_32 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"][number]["nil"], never>]: never; };
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    } & {
                        min?: number;
                        max?: number;
                    } & { [K_33 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & {
                        keyboardMax?: number;
                        consumerMax?: number;
                    } & { [K_34 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                    layerId?: {} & {} & { [K_35 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"][number]["layerId"], never>]: never; };
                } & { [K_36 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_37 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number]["param2"], keyof {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[]>]: never; };
            } & { [K_38 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"][number], keyof BehaviorBindingParametersSet>]: never; })[] & { [K_39 in Exclude<keyof I_1["getBehaviorDetails"]["metadata"], keyof {
                param1?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
                param2?: {
                    name?: string;
                    nil?: {};
                    constant?: number | undefined;
                    range?: {
                        min?: number;
                        max?: number;
                    };
                    hidUsage?: {
                        keyboardMax?: number;
                        consumerMax?: number;
                    };
                    layerId?: {};
                }[];
            }[]>]: never; };
        } & { [K_40 in Exclude<keyof I_1["getBehaviorDetails"], keyof GetBehaviorDetailsResponse>]: never; };
        getBehaviorRuntimeConfig?: {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            };
        } & {
            behaviorId?: number;
            holdTap?: {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & {
                tappingTermMs?: number;
                quickTapMs?: number;
                requirePriorIdleMs?: number;
                flavor?: HoldTapFlavor;
                holdBehaviorId?: number;
                tapBehaviorId?: number;
            } & { [K_41 in Exclude<keyof I_1["getBehaviorRuntimeConfig"]["holdTap"], keyof HoldTapRuntimeConfig>]: never; };
            tapDance?: {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[];
            } & {
                tappingTermMs?: number;
                bindings?: {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[] & ({
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                } & { [K_42 in Exclude<keyof I_1["getBehaviorRuntimeConfig"]["tapDance"]["bindings"][number], keyof BehaviorBinding>]: never; })[] & { [K_43 in Exclude<keyof I_1["getBehaviorRuntimeConfig"]["tapDance"]["bindings"], keyof {
                    behaviorId?: number;
                    param1?: number;
                    param2?: number;
                }[]>]: never; };
            } & { [K_44 in Exclude<keyof I_1["getBehaviorRuntimeConfig"]["tapDance"], keyof TapDanceRuntimeConfig>]: never; };
            stickyKey?: {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & {
                releaseAfterMs?: number;
                quickRelease?: boolean;
                lazy?: boolean;
                ignoreModifiers?: boolean;
                behaviorId?: number;
            } & { [K_45 in Exclude<keyof I_1["getBehaviorRuntimeConfig"]["stickyKey"], keyof StickyKeyRuntimeConfig>]: never; };
        } & { [K_46 in Exclude<keyof I_1["getBehaviorRuntimeConfig"], keyof BehaviorRuntimeConfig>]: never; };
        setBehaviorRuntimeConfig?: SetBehaviorRuntimeConfigResponseCode | undefined;
    } & { [K_47 in Exclude<keyof I_1, keyof Response>]: never; }>(object: I_1): Response;
};
export declare const ListAllBehaviorsResponse: {
    encode(message: ListAllBehaviorsResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): ListAllBehaviorsResponse;
    fromJSON(object: any): ListAllBehaviorsResponse;
    toJSON(message: ListAllBehaviorsResponse): unknown;
    create<I extends {
        behaviors?: number[];
    } & {
        behaviors?: number[] & number[] & { [K in Exclude<keyof I["behaviors"], keyof number[]>]: never; };
    } & { [K_1 in Exclude<keyof I, "behaviors">]: never; }>(base?: I): ListAllBehaviorsResponse;
    fromPartial<I_1 extends {
        behaviors?: number[];
    } & {
        behaviors?: number[] & number[] & { [K_2 in Exclude<keyof I_1["behaviors"], keyof number[]>]: never; };
    } & { [K_3 in Exclude<keyof I_1, "behaviors">]: never; }>(object: I_1): ListAllBehaviorsResponse;
};
export declare const GetBehaviorDetailsResponse: {
    encode(message: GetBehaviorDetailsResponse, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): GetBehaviorDetailsResponse;
    fromJSON(object: any): GetBehaviorDetailsResponse;
    toJSON(message: GetBehaviorDetailsResponse): unknown;
    create<I extends {
        id?: number;
        displayName?: string;
        metadata?: {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[];
    } & {
        id?: number;
        displayName?: string;
        metadata?: {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[] & ({
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        } & {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[] & ({
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            } & {
                name?: string;
                nil?: {} & {} & { [K in Exclude<keyof I["metadata"][number]["param1"][number]["nil"], never>]: never; };
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                } & {
                    min?: number;
                    max?: number;
                } & { [K_1 in Exclude<keyof I["metadata"][number]["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & { [K_2 in Exclude<keyof I["metadata"][number]["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                layerId?: {} & {} & { [K_3 in Exclude<keyof I["metadata"][number]["param1"][number]["layerId"], never>]: never; };
            } & { [K_4 in Exclude<keyof I["metadata"][number]["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_5 in Exclude<keyof I["metadata"][number]["param1"], keyof {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[]>]: never; };
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[] & ({
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            } & {
                name?: string;
                nil?: {} & {} & { [K_6 in Exclude<keyof I["metadata"][number]["param2"][number]["nil"], never>]: never; };
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                } & {
                    min?: number;
                    max?: number;
                } & { [K_7 in Exclude<keyof I["metadata"][number]["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & { [K_8 in Exclude<keyof I["metadata"][number]["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                layerId?: {} & {} & { [K_9 in Exclude<keyof I["metadata"][number]["param2"][number]["layerId"], never>]: never; };
            } & { [K_10 in Exclude<keyof I["metadata"][number]["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_11 in Exclude<keyof I["metadata"][number]["param2"], keyof {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[]>]: never; };
        } & { [K_12 in Exclude<keyof I["metadata"][number], keyof BehaviorBindingParametersSet>]: never; })[] & { [K_13 in Exclude<keyof I["metadata"], keyof {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[]>]: never; };
    } & { [K_14 in Exclude<keyof I, keyof GetBehaviorDetailsResponse>]: never; }>(base?: I): GetBehaviorDetailsResponse;
    fromPartial<I_1 extends {
        id?: number;
        displayName?: string;
        metadata?: {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[];
    } & {
        id?: number;
        displayName?: string;
        metadata?: {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[] & ({
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        } & {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[] & ({
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            } & {
                name?: string;
                nil?: {} & {} & { [K_15 in Exclude<keyof I_1["metadata"][number]["param1"][number]["nil"], never>]: never; };
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                } & {
                    min?: number;
                    max?: number;
                } & { [K_16 in Exclude<keyof I_1["metadata"][number]["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & { [K_17 in Exclude<keyof I_1["metadata"][number]["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                layerId?: {} & {} & { [K_18 in Exclude<keyof I_1["metadata"][number]["param1"][number]["layerId"], never>]: never; };
            } & { [K_19 in Exclude<keyof I_1["metadata"][number]["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_20 in Exclude<keyof I_1["metadata"][number]["param1"], keyof {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[]>]: never; };
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[] & ({
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            } & {
                name?: string;
                nil?: {} & {} & { [K_21 in Exclude<keyof I_1["metadata"][number]["param2"][number]["nil"], never>]: never; };
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                } & {
                    min?: number;
                    max?: number;
                } & { [K_22 in Exclude<keyof I_1["metadata"][number]["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & {
                    keyboardMax?: number;
                    consumerMax?: number;
                } & { [K_23 in Exclude<keyof I_1["metadata"][number]["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
                layerId?: {} & {} & { [K_24 in Exclude<keyof I_1["metadata"][number]["param2"][number]["layerId"], never>]: never; };
            } & { [K_25 in Exclude<keyof I_1["metadata"][number]["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_26 in Exclude<keyof I_1["metadata"][number]["param2"], keyof {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[]>]: never; };
        } & { [K_27 in Exclude<keyof I_1["metadata"][number], keyof BehaviorBindingParametersSet>]: never; })[] & { [K_28 in Exclude<keyof I_1["metadata"], keyof {
            param1?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
            param2?: {
                name?: string;
                nil?: {};
                constant?: number | undefined;
                range?: {
                    min?: number;
                    max?: number;
                };
                hidUsage?: {
                    keyboardMax?: number;
                    consumerMax?: number;
                };
                layerId?: {};
            }[];
        }[]>]: never; };
    } & { [K_29 in Exclude<keyof I_1, keyof GetBehaviorDetailsResponse>]: never; }>(object: I_1): GetBehaviorDetailsResponse;
};
export declare const BehaviorBindingParametersSet: {
    encode(message: BehaviorBindingParametersSet, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorBindingParametersSet;
    fromJSON(object: any): BehaviorBindingParametersSet;
    toJSON(message: BehaviorBindingParametersSet): unknown;
    create<I extends {
        param1?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[];
        param2?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[];
    } & {
        param1?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[] & ({
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        } & {
            name?: string;
            nil?: {} & {} & { [K in Exclude<keyof I["param1"][number]["nil"], never>]: never; };
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            } & {
                min?: number;
                max?: number;
            } & { [K_1 in Exclude<keyof I["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            } & {
                keyboardMax?: number;
                consumerMax?: number;
            } & { [K_2 in Exclude<keyof I["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
            layerId?: {} & {} & { [K_3 in Exclude<keyof I["param1"][number]["layerId"], never>]: never; };
        } & { [K_4 in Exclude<keyof I["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_5 in Exclude<keyof I["param1"], keyof {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[]>]: never; };
        param2?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[] & ({
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        } & {
            name?: string;
            nil?: {} & {} & { [K_6 in Exclude<keyof I["param2"][number]["nil"], never>]: never; };
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            } & {
                min?: number;
                max?: number;
            } & { [K_7 in Exclude<keyof I["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            } & {
                keyboardMax?: number;
                consumerMax?: number;
            } & { [K_8 in Exclude<keyof I["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
            layerId?: {} & {} & { [K_9 in Exclude<keyof I["param2"][number]["layerId"], never>]: never; };
        } & { [K_10 in Exclude<keyof I["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_11 in Exclude<keyof I["param2"], keyof {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[]>]: never; };
    } & { [K_12 in Exclude<keyof I, keyof BehaviorBindingParametersSet>]: never; }>(base?: I): BehaviorBindingParametersSet;
    fromPartial<I_1 extends {
        param1?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[];
        param2?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[];
    } & {
        param1?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[] & ({
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        } & {
            name?: string;
            nil?: {} & {} & { [K_13 in Exclude<keyof I_1["param1"][number]["nil"], never>]: never; };
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            } & {
                min?: number;
                max?: number;
            } & { [K_14 in Exclude<keyof I_1["param1"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            } & {
                keyboardMax?: number;
                consumerMax?: number;
            } & { [K_15 in Exclude<keyof I_1["param1"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
            layerId?: {} & {} & { [K_16 in Exclude<keyof I_1["param1"][number]["layerId"], never>]: never; };
        } & { [K_17 in Exclude<keyof I_1["param1"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_18 in Exclude<keyof I_1["param1"], keyof {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[]>]: never; };
        param2?: {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[] & ({
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        } & {
            name?: string;
            nil?: {} & {} & { [K_19 in Exclude<keyof I_1["param2"][number]["nil"], never>]: never; };
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            } & {
                min?: number;
                max?: number;
            } & { [K_20 in Exclude<keyof I_1["param2"][number]["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            } & {
                keyboardMax?: number;
                consumerMax?: number;
            } & { [K_21 in Exclude<keyof I_1["param2"][number]["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
            layerId?: {} & {} & { [K_22 in Exclude<keyof I_1["param2"][number]["layerId"], never>]: never; };
        } & { [K_23 in Exclude<keyof I_1["param2"][number], keyof BehaviorParameterValueDescription>]: never; })[] & { [K_24 in Exclude<keyof I_1["param2"], keyof {
            name?: string;
            nil?: {};
            constant?: number | undefined;
            range?: {
                min?: number;
                max?: number;
            };
            hidUsage?: {
                keyboardMax?: number;
                consumerMax?: number;
            };
            layerId?: {};
        }[]>]: never; };
    } & { [K_25 in Exclude<keyof I_1, keyof BehaviorBindingParametersSet>]: never; }>(object: I_1): BehaviorBindingParametersSet;
};
export declare const BehaviorParameterValueDescriptionRange: {
    encode(message: BehaviorParameterValueDescriptionRange, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorParameterValueDescriptionRange;
    fromJSON(object: any): BehaviorParameterValueDescriptionRange;
    toJSON(message: BehaviorParameterValueDescriptionRange): unknown;
    create<I extends {
        min?: number;
        max?: number;
    } & {
        min?: number;
        max?: number;
    } & { [K in Exclude<keyof I, keyof BehaviorParameterValueDescriptionRange>]: never; }>(base?: I): BehaviorParameterValueDescriptionRange;
    fromPartial<I_1 extends {
        min?: number;
        max?: number;
    } & {
        min?: number;
        max?: number;
    } & { [K_1 in Exclude<keyof I_1, keyof BehaviorParameterValueDescriptionRange>]: never; }>(object: I_1): BehaviorParameterValueDescriptionRange;
};
export declare const BehaviorParameterNil: {
    encode(_: BehaviorParameterNil, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorParameterNil;
    fromJSON(_: any): BehaviorParameterNil;
    toJSON(_: BehaviorParameterNil): unknown;
    create<I extends {} & {} & { [K in Exclude<keyof I, never>]: never; }>(base?: I): BehaviorParameterNil;
    fromPartial<I_1 extends {} & {} & { [K_1 in Exclude<keyof I_1, never>]: never; }>(_: I_1): BehaviorParameterNil;
};
export declare const BehaviorParameterLayerId: {
    encode(_: BehaviorParameterLayerId, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorParameterLayerId;
    fromJSON(_: any): BehaviorParameterLayerId;
    toJSON(_: BehaviorParameterLayerId): unknown;
    create<I extends {} & {} & { [K in Exclude<keyof I, never>]: never; }>(base?: I): BehaviorParameterLayerId;
    fromPartial<I_1 extends {} & {} & { [K_1 in Exclude<keyof I_1, never>]: never; }>(_: I_1): BehaviorParameterLayerId;
};
export declare const BehaviorParameterHidUsage: {
    encode(message: BehaviorParameterHidUsage, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorParameterHidUsage;
    fromJSON(object: any): BehaviorParameterHidUsage;
    toJSON(message: BehaviorParameterHidUsage): unknown;
    create<I extends {
        keyboardMax?: number;
        consumerMax?: number;
    } & {
        keyboardMax?: number;
        consumerMax?: number;
    } & { [K in Exclude<keyof I, keyof BehaviorParameterHidUsage>]: never; }>(base?: I): BehaviorParameterHidUsage;
    fromPartial<I_1 extends {
        keyboardMax?: number;
        consumerMax?: number;
    } & {
        keyboardMax?: number;
        consumerMax?: number;
    } & { [K_1 in Exclude<keyof I_1, keyof BehaviorParameterHidUsage>]: never; }>(object: I_1): BehaviorParameterHidUsage;
};
export declare const BehaviorParameterValueDescription: {
    encode(message: BehaviorParameterValueDescription, writer?: _m0.Writer): _m0.Writer;
    decode(input: _m0.Reader | Uint8Array, length?: number): BehaviorParameterValueDescription;
    fromJSON(object: any): BehaviorParameterValueDescription;
    toJSON(message: BehaviorParameterValueDescription): unknown;
    create<I extends {
        name?: string;
        nil?: {};
        constant?: number | undefined;
        range?: {
            min?: number;
            max?: number;
        };
        hidUsage?: {
            keyboardMax?: number;
            consumerMax?: number;
        };
        layerId?: {};
    } & {
        name?: string;
        nil?: {} & {} & { [K in Exclude<keyof I["nil"], never>]: never; };
        constant?: number | undefined;
        range?: {
            min?: number;
            max?: number;
        } & {
            min?: number;
            max?: number;
        } & { [K_1 in Exclude<keyof I["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
        hidUsage?: {
            keyboardMax?: number;
            consumerMax?: number;
        } & {
            keyboardMax?: number;
            consumerMax?: number;
        } & { [K_2 in Exclude<keyof I["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
        layerId?: {} & {} & { [K_3 in Exclude<keyof I["layerId"], never>]: never; };
    } & { [K_4 in Exclude<keyof I, keyof BehaviorParameterValueDescription>]: never; }>(base?: I): BehaviorParameterValueDescription;
    fromPartial<I_1 extends {
        name?: string;
        nil?: {};
        constant?: number | undefined;
        range?: {
            min?: number;
            max?: number;
        };
        hidUsage?: {
            keyboardMax?: number;
            consumerMax?: number;
        };
        layerId?: {};
    } & {
        name?: string;
        nil?: {} & {} & { [K_5 in Exclude<keyof I_1["nil"], never>]: never; };
        constant?: number | undefined;
        range?: {
            min?: number;
            max?: number;
        } & {
            min?: number;
            max?: number;
        } & { [K_6 in Exclude<keyof I_1["range"], keyof BehaviorParameterValueDescriptionRange>]: never; };
        hidUsage?: {
            keyboardMax?: number;
            consumerMax?: number;
        } & {
            keyboardMax?: number;
            consumerMax?: number;
        } & { [K_7 in Exclude<keyof I_1["hidUsage"], keyof BehaviorParameterHidUsage>]: never; };
        layerId?: {} & {} & { [K_8 in Exclude<keyof I_1["layerId"], never>]: never; };
    } & { [K_9 in Exclude<keyof I_1, keyof BehaviorParameterValueDescription>]: never; }>(object: I_1): BehaviorParameterValueDescription;
};
type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export {};
