const convict = require('convict');

export const config = convict({
    modelId: {
        doc: 'The ID of the Amazon Bedrock Foundation Model',
        format: String,
        default: '',
        env: 'BEDROCK_MODEL_ID',
    },
    knowledgeBaseId: {
        doc: 'The ID of the Amazon Bedrock Knowledge Base',
        format: String,
        default: '',
        env: 'KNOWLEDGE_BASE_ID',
    },
    dataSourceId: {
        doc: 'The data source Id of the S3 bucket',
        format: String,
        default: '',
        env: 'DATA_SOURCE_ID',
    },
}).validate({ allowed: 'strict' });
