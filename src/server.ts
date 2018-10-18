import fetch from 'node-fetch';
import { HttpLink } from 'apollo-link-http';
import { ApolloServer } from 'apollo-server';
import { buildSchema, GraphQLNamedType } from 'graphql';
import { introspectSchema, makeRemoteExecutableSchema, mergeSchemas, transformSchema, FilterRootFields, ReplaceFieldWithFragment, FilterTypes } from 'graphql-tools';
import { loader as currencyLoader } from './loaders/currency';
import { CurrencyInput, CurrencyOutput } from './interfaces';

async function run() {
    const createRemoteSchema = async (uri: string) => {
        const link = new HttpLink({ uri, fetch: fetch as any });
        const schema = makeRemoteExecutableSchema({
            schema: await introspectSchema(link),
            link,
        });
        return schema;
    }

    // Create resolvers
    const resolvers = {
        Query: {
            currency: async (args: any, vars: Partial<CurrencyInput>): Promise<CurrencyOutput[] | null> => {
                if (!vars.symbol) {
                    return null;
                }
                return await currencyLoader().loadMany(vars.symbol);
            }
        }
    };

    // Create schemas
    const currencySchema = buildSchema(`
        type Currency {
            symbol: String
            exchange: Float
        }
        
        type Query {
            currency(symbol: [String]): [Currency]
        }`);
    const countrySchema = await createRemoteSchema('https://countries.thinkjson.com');

    // Merge schemas
    const schema = mergeSchemas({
        schemas: [countrySchema, currencySchema],
        resolvers
    });

    // Create server and start listening
    const server = new ApolloServer({
        schema,
        introspection: true,
        playground: true,
        cacheControl: {
            defaultMaxAge: 3600,
        },
    });
    server.listen({ port: process.env.PORT }).then(({ url }) => {
        console.log(`🚀  Server ready at ${url}`);
    });
}

run().catch(e => console.error(e));