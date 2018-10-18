import * as DataLoader from 'dataloader';
import * as cache from 'memory-cache';
import fetch from 'node-fetch';
import { CurrencyOutput } from '../interfaces';
import { FIXER_API_KEY } from '../settings';

const CACHE_TIME = 3600000;

interface CurrencyError {
    code: number;
    type: string;
    info: string;
}

interface CurrencyResponse {
    success: boolean;
    timestamp: number;
    base: string;
    date: string;
    rates: {[symbol: string]: number};
    error?: CurrencyError;
}

function cacheKey(key: string) {
    return `currency-${key}`;
}

async function fetchCurrency(keys: string[]): Promise<(CurrencyOutput | Error)[]> {
    // First check cache for these keys
    const misses: string[] = [];
    const responses: {[key: string]: number} = {};
    keys.forEach(key => {
        const value = cache.get(cacheKey(key));
        if (value === null) {
            misses.push(key);
        } else {
            responses[key] = value;
        }
    });
    const hits: string[] = Object.keys(responses);
    if (hits.length > 0) {
        console.log(`cache hit for ${hits.join(",")}`);
    }

    // Fetch missing keys from the API
    if (misses.length) {
        const url = `http://data.fixer.io/api/latest?access_key=${FIXER_API_KEY}&symbols=${misses.join(",")}&format=1`;
        const response = await fetch(url);
        const currencyResponse: CurrencyResponse = await response.json();
        console.debug(`cache miss for ${misses.join(",")}\n`, currencyResponse);
        if (!currencyResponse.success) {
            throw new Error(currencyResponse.error
                ? currencyResponse.error.info
                : "There was an error fetching currency information");
        }

        // Collect responses
        Object.keys(currencyResponse.rates).forEach(key => {
            const value = currencyResponse.rates[key];
            cache.put(cacheKey(key), value, CACHE_TIME);
            responses[key] = value;
        });
    }

    // Return responses in the same order they were requested
    return keys.map((symbol): CurrencyOutput => {
        return { symbol, exchange: responses[symbol] };
    });
}

export const loader = () => new DataLoader<string, CurrencyOutput>(keys => fetchCurrency(keys));