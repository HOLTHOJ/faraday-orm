import {ExpressionAttributeNameMap, ExpressionAttributeValueMap} from "aws-sdk/clients/dynamodb";


export class ExpressionAttributes {

    get values() : ExpressionAttributeValueMap {
        throw ""
    }

    get names() : ExpressionAttributeNameMap {
        throw ""
    }

    // merge(expression : ExpressionAttributes) : ExpressionAttributes {
    //     throw ""
    // }

}