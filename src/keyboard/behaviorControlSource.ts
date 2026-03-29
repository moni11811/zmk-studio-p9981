export interface BehaviorProperty {
  key: string;
  value: string;
}

export interface CustomBehavior {
  alias: string;
  nodeName: string;
  properties: BehaviorProperty[];
}

export interface BehaviorReconfiguration {
  target: string;
  properties: BehaviorProperty[];
}

interface SourceSectionRange {
  start: number;
  end: number;
}

export interface BehaviorSourceDocument {
  content: string;
  newline: string;
  customBehaviors: CustomBehavior[];
  reconfigurations: BehaviorReconfiguration[];
  sections: {
    customBehaviors?: SourceSectionRange;
    reconfigurations?: SourceSectionRange;
  };
  anchors: {
    rootStart: number;
    keymapStart: number;
  };
}

const NEWLINE_PATTERN = String.raw`\r?\n`;

const RECONFIGURATION_BLOCK_PATTERN = new RegExp(
  [
    String.raw`(^[ \t]*&([A-Za-z0-9_]+)\s*\{`,
    NEWLINE_PATTERN,
    String.raw`([\s\S]*?)^[ \t]*\};[ \t]*(?:`,
    NEWLINE_PATTERN,
    String.raw`)?`,
    String.raw`)`,
  ].join(""),
  "gm"
);

const CUSTOM_BEHAVIOR_BLOCK_PATTERN = new RegExp(
  [
    String.raw`(^[ \t]*behaviors\s*\{`,
    NEWLINE_PATTERN,
    String.raw`[ \t]*([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)\s*\{`,
    NEWLINE_PATTERN,
    String.raw`([\s\S]*?)^[ \t]*\};`,
    NEWLINE_PATTERN,
    String.raw`[ \t]*\};[ \t]*(?:`,
    NEWLINE_PATTERN,
    String.raw`)?`,
    String.raw`)`,
  ].join(""),
  "gm"
);

function detectNewline(content: string): string {
  return content.includes("\r\n") ? "\r\n" : "\n";
}

function parseProperties(body: string): BehaviorProperty[] {
  return body
    .split("\n")
    .map((line) =>
      line
        .replace(/\/\*.*?\*\//g, "")
        .replace(/\/\/.*$/g, "")
        .trim()
    )
    .filter((line) => line.length > 0)
    .map((line) => {
      if (line.endsWith(";")) {
        const withoutSemi = line.slice(0, -1).trim();
        const equalsIndex = withoutSemi.indexOf("=");
        if (equalsIndex >= 0) {
          return {
            key: withoutSemi.slice(0, equalsIndex).trim(),
            value: withoutSemi.slice(equalsIndex + 1).trim(),
          };
        }

        return {
          key: withoutSemi,
          value: "",
        };
      }

      return {
        key: line,
        value: "",
      };
    });
}

function findKeymapStart(content: string): number {
  const keymapMatch = /^[ \t]*keymap\s*\{/gm.exec(content);
  if (!keymapMatch || keymapMatch.index === undefined) {
    throw new Error("Could not locate keymap block in source");
  }

  return keymapMatch.index;
}

function findRootStart(content: string): number {
  const rootStart = content.indexOf("/ {");
  if (rootStart < 0) {
    throw new Error("Could not locate root node in source");
  }

  return rootStart;
}

function findSectionRange<T extends { index: number; 0: string }>(
  matches: T[]
): SourceSectionRange | undefined {
  if (matches.length === 0) {
    return undefined;
  }

  const first = matches[0];
  const last = matches[matches.length - 1];

  return {
    start: first.index,
    end: last.index + last[0].length,
  };
}

export function parseBehaviorSourceDocument(content: string): BehaviorSourceDocument {
  const reconfigurationMatches = Array.from(
    content.matchAll(RECONFIGURATION_BLOCK_PATTERN)
  );
  const customBehaviorMatches = Array.from(
    content.matchAll(CUSTOM_BEHAVIOR_BLOCK_PATTERN)
  );

  return {
    content,
    newline: detectNewline(content),
    reconfigurations: reconfigurationMatches.map((match) => ({
      target: match[2],
      properties: parseProperties(match[3]),
    })),
    customBehaviors: customBehaviorMatches.map((match) => ({
      alias: match[2],
      nodeName: match[3],
      properties: parseProperties(match[4]),
    })),
    sections: {
      reconfigurations: findSectionRange(reconfigurationMatches),
      customBehaviors: findSectionRange(customBehaviorMatches),
    },
    anchors: {
      rootStart: findRootStart(content),
      keymapStart: findKeymapStart(content),
    },
  };
}

function renderProperties(
  properties: BehaviorProperty[],
  indent: string,
  newline: string
): string {
  return properties
    .filter((property) => property.key.trim().length > 0)
    .map((property) => {
      const key = property.key.trim();
      const value = property.value.trim();
      return value.length > 0
        ? `${indent}${key} = ${value};`
        : `${indent}${key};`;
    })
    .join(newline);
}

function renderReconfiguration(
  reconfiguration: BehaviorReconfiguration,
  newline: string
): string {
  const properties = renderProperties(reconfiguration.properties, "    ", newline);

  return `&${reconfiguration.target.trim()} {${newline}${properties}${newline}};`;
}

function renderCustomBehavior(behavior: CustomBehavior, newline: string): string {
  const properties = renderProperties(behavior.properties, "            ", newline);

  return [
    "    behaviors {",
    `        ${behavior.alias.trim()}: ${behavior.nodeName.trim()} {`,
    properties,
    "        };",
    "    };",
  ].join(newline);
}

function applyEdits(
  content: string,
  edits: { start: number; end: number; text: string }[]
): string {
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (updated, edit) =>
        updated.slice(0, edit.start) + edit.text + updated.slice(edit.end),
      content
    );
}

export function serializeBehaviorSourceDocument(
  document: BehaviorSourceDocument
): string {
  const edits: { start: number; end: number; text: string }[] = [];
  const newline = document.newline;
  const renderedReconfigurations = document.reconfigurations
    .filter((reconfiguration) => reconfiguration.target.trim().length > 0)
    .map((reconfiguration) => renderReconfiguration(reconfiguration, newline))
    .join(`${newline}${newline}`);
  const renderedCustomBehaviors = document.customBehaviors
    .filter(
      (behavior) =>
        behavior.alias.trim().length > 0 && behavior.nodeName.trim().length > 0
    )
    .map((behavior) => renderCustomBehavior(behavior, newline))
    .join(`${newline}${newline}`);

  if (document.sections.reconfigurations) {
    edits.push({
      start: document.sections.reconfigurations.start,
      end: document.sections.reconfigurations.end,
      text:
        renderedReconfigurations.length > 0
          ? `${renderedReconfigurations}${newline}${newline}`
          : "",
    });
  } else if (renderedReconfigurations.length > 0) {
    edits.push({
      start: document.anchors.rootStart,
      end: document.anchors.rootStart,
      text: `${renderedReconfigurations}${newline}${newline}`,
    });
  }

  if (document.sections.customBehaviors) {
    edits.push({
      start: document.sections.customBehaviors.start,
      end: document.sections.customBehaviors.end,
      text:
        renderedCustomBehaviors.length > 0
          ? `${renderedCustomBehaviors}${newline}${newline}`
          : "",
    });
  } else if (renderedCustomBehaviors.length > 0) {
    edits.push({
      start: document.anchors.keymapStart,
      end: document.anchors.keymapStart,
      text: `${renderedCustomBehaviors}${newline}${newline}`,
    });
  }

  return applyEdits(document.content, edits);
}
