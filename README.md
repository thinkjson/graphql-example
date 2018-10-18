# graphql-example
An example of using GraphQL as an API gateway.

An example query:

    query {
        currency(symbol: ["USD","CAD","MXN"]) {
            symbol
            exchange
        }
        country(code: "MX") {
            currency
        }
    }
