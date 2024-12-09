type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

export type Component = JSONValue | Record<string, any>;
export type ComponentId = number;

// export function defineComponent(name: string, componentSchema: ) {
//   return {

//   }
// }
