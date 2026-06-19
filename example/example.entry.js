import { convert_rules } from "../src/index.js";
const rules = [{
    "name": "station_GD8",
    "tags": {
        "station_name": "GD8",
        "stationID": 8078,
        "peoples": [
            { "name": '张三', "age": 19 },
            { "name": '李四', "age": 32 },
        ]
    },
}, {
    "name": "station_GD9",
    "tags": {
        "station_name": "GD9",
        "stationID": 8079,
        "peoples": [
            { "name": '王五', "age": 39 },
            { "name": '赵六', "age": 29 },
        ]
    },
}];

const template = `{{station_name}}
station ID: {{stationID}}
people:
{{for people in peoples}}_
- {{people.name}}
{{endfor}}_
`;

for (const { name, content } of convert_rules(rules, template)) {
    console.log(`${name}\n=======`);
    console.log(content);
}
