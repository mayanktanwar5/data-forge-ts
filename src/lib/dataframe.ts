import { ArrayIterable }  from './iterables/array-iterable';
import { EmptyIterable }  from './iterables/empty-iterable';
import { CountIterable }  from './iterables/count-iterable';
import { MultiIterable }  from './iterables/multi-iterable';
import { SelectIterable }  from './iterables/select-iterable';
import { SelectManyIterable }  from './iterables/select-many-iterable';
import { TakeIterable }  from './iterables/take-iterable';
import { TakeWhileIterable }  from './iterables/take-while-iterable';
import { WhereIterable }  from './iterables/where-iterable';
import { ConcatIterable }  from './iterables/concat-iterable';
import { DataFrameWindowIterable }  from './iterables/dataframe-window-iterable';
import { ReverseIterable }  from './iterables/reverse-iterable';
import { ZipIterable }  from './iterables/zip-iterable';
import { CsvRowsIterable }  from './iterables/csv-rows-iterable';
import { DistinctIterable }  from './iterables/distinct-iterable';
import { DataFrameRollingWindowIterable }  from './iterables/dataframe-rolling-window-iterable';
import { DataFrameVariableWindowIterable }  from './iterables/dataframe-variable-window-iterable';
import { OrderedIterable, Direction, ISortSpec, SelectorFn as SortSelectorFn }  from './iterables/ordered-iterable';
import * as Sugar from 'sugar';
import { IIndex, Index } from './index';
import { ExtractElementIterable } from './iterables/extract-element-iterable';
import { SkipIterable } from './iterables/skip-iterable';
import { SkipWhileIterable } from './iterables/skip-while-iterable';
const Table = require('easy-table');
import { assert } from 'chai';
import * as moment from 'moment';
import { ISeries, Series, SelectorWithIndexFn, PredicateFn, ComparerFn, SelectorFn, AggregateFn, Zip2Fn, Zip3Fn, Zip4Fn, Zip5Fn, ZipNFn, CallbackFn, JoinFn, GapFillFn, ISeriesConfig } from './series';
import { ColumnNamesIterable } from './iterables/column-names-iterable';
import { toMap, makeDistinct, mapIterable, determineType } from './utils';
import { Utils } from 'handlebars';

const PapaParse = require('papaparse');

/** 
 * An object whose fields specify named columns.
 */
export interface IColumnSpec {
    [index: string]: Iterable<any> | ISeries<any, any>,
}

/**
 * Specifes the format per column when converting columns to strings.
 */
export interface IFormatSpec {
    [index: string]: string;
}

/**
 * Specification that defines output columns for a pivot.
 */
export interface IAggregatorSpec {
    [index: string]: (values: ISeries<number, any>) => any
} 

/**
 * Specification for pivoting values in named columns..
 */
export interface IPivotAggregateSpec {
    [index: string]: IAggregatorSpec;
}

/**
 * Defines the configuration for a new column.
 */
export interface IColumnConfig {
    /**
     * The name of the new column.
     */
    name: string;

    /**
     * The series of values for the column.
     */
    series: Iterable<any> | ISeries<any, any>;
}

/**
 * DataFrame configuration.
 */
export interface IDataFrameConfig<IndexT, ValueT> {
    values?: Iterable<ValueT>,
    rows?: Iterable<any[]>,
    index?: Iterable<IndexT>,
    pairs?: Iterable<[IndexT, ValueT]>,
    columnNames?: Iterable<string>,
    baked?: boolean,
    considerAllRows?: boolean,
    columns?: Iterable<IColumnConfig> | IColumnSpec,
};

/** 
 * Represents a name column in a dataframe.
 */
export interface IColumn {
    
    /**
     * The name of the column.
     */
    name: string;

    /**
     * The data type of the column.
     */
    type: string;

    /**
     * The data series from the column.
     */
    series: ISeries<any, any>;
}

/** 
 * An object whose fields specify named columns or functions to generate columns.
 */
export interface IColumnGenSpec { //todo: this should allow iterable as well!
    [index: string]: ISeries<any, any> | SeriesSelectorFn<any, any, any>,
}

/**
 * Specifies how to rename columns.
 */
export interface IColumnRenameSpec {
    [index: string]: string;
}

/**
 * Specifies columns to transform.
 */
export interface IColumnTransformSpec {
    [index: string]: SelectorWithIndexFn<any, any>;
}

/**
 * A spec for aggregating a collection of names columns.
 */
export interface IColumnAggregateSpec {
    [index: string]: AggregateFn<any, any>;
}

/**
 * A selector function that can select a series from a dataframe.
 */
export type SeriesSelectorFn<IndexT, DataFrameValueT, SeriesValueT> = (dataFrame: IDataFrame<IndexT, DataFrameValueT>) => ISeries<IndexT, SeriesValueT>;

/*
 * A function that generates a dataframe content object.
 * Used to make it easy to create lazy evaluated dataframe.
 */
export type DataFrameConfigFn<IndexT, ValueT> = () => IDataFrameConfig<IndexT, ValueT>;

/**
 * Represents the frequency of a type in a series or dataframe.
 */
export interface ITypeFrequency {

    /**
     * Name of the column containing the value.
     */
    Column: string;

    /**
     * The name of the type.
     */
    Type: string; 

    /**
     * The frequency of the type's appearance in the series or dataframe.
     */
    Frequency: number;
}

/**
 * Represents the frequency of a value in a series or dataframe.
 */
export interface IValueFrequency {

    /**
     * Name of the column containing the value.
     */
    Column: string;

    /**
     * The value.
     */
    Value: any; 

    /**
     * The frequency of the value's appearance in the series or dataframe.
     */
    Frequency: number;
}

/**
 * Interface that represents a dataframe.
 * A dataframe contains an indexed sequence of data records.
 * Think of it as a spreadsheet or CSV file in memory.
 * 
 * Each data record contains multiple named fields, the value of each field represents one row in a column of data.
 * Each column of data is a named {@link Series}.
 * You think of a dataframe a collection of named data series.
 * 
 * @typeparam IndexT The type to use for the index.
 * @typeparam ValueT The type to use for each row/data record.
 */
export interface IDataFrame<IndexT = number, ValueT = any> extends Iterable<ValueT> {

    /**
     * Get an iterator to enumerate the values of the dataframe.
     * Enumerating the iterator forces lazy evaluation to complete.
     * This function is automatically called by `for...of`.
     * 
     * @returns An iterator for the dataframe.
     * 
     * @example
     * <pre>
     * 
     * for (const row of df) {
     *     // ... do something with the row ...
     * }
     * </pre>
     */
    [Symbol.iterator](): Iterator<ValueT>;

    /**
     * Get the names of the columns in the dataframe.
     * 
     * @returns Returns an array of the column names in the dataframe.  
     */
    getColumnNames (): string[];

    /** 
     * Retreive a collection of all columns in the dataframe.
     * 
     * @returns Returns a series the columns in the dataframe.
     */
    getColumns (): ISeries<number, IColumn>;

    /**
     * Cast the value of the dataframe to a new type.
     * This operation has no effect but to retype the value that the dataframe contains.
     */
    cast<NewValueT> (): IDataFrame<IndexT, NewValueT>;
    
    /**
     * Get the index for the dataframe.
     */
    getIndex (): IIndex<IndexT>;

    /**
     * Set a named column as the index of the data-frame.
     *
     * @param columnName - Name or index of the column to set as the index.
     *
     * @returns Returns a new dataframe with the values of a particular named column as the index.  
     */
    setIndex<NewIndexT = any> (columnName: string): IDataFrame<NewIndexT, ValueT>;
    
    /**
     * Apply a new index to the dataframe.
     * 
     * @param newIndex The new index to apply to the dataframe.
     * 
     * @returns Returns a new dataframe with the specified index attached.
     */
    withIndex<NewIndexT> (newIndex: Iterable<NewIndexT> | SelectorFn<ValueT, NewIndexT>): IDataFrame<NewIndexT, ValueT>;

    /**
     * Resets the index of the dataframe back to the default zero-based sequential integer index.
     * 
     * @returns Returns a new dataframe with the index reset to the default zero-based index. 
     */
    resetIndex (): IDataFrame<number, ValueT>;
    
    /**
     * Retreive a series from a column of the dataframe.
     *
     * @param columnName Specifies the name of the column that contains the series to retreive.
     */
    getSeries<SeriesValueT = any> (columnName: string): ISeries<IndexT, SeriesValueT>;

    /**
     * Returns true if the column with the requested name exists in the dataframe.
     *
     * @param columnName - Name of the column to check.
     */
    hasSeries (columnName: string): boolean;

    /**
     * 
     * Verify the existance of a column and return it.
     * Throws an exception if the column doesn't exist.
     *
     * @param columnName - Name or index of the column to retreive.
     */
    expectSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT>;

    /**
     * Create a new dataframe with an additional column specified by the passed-in series.
     *
     * @param columnNameOrSpec - The name of the column to add or replace.
     * @param [series] - When columnNameOrSpec is a string that identifies the column to add, this specifies the Series to add to the data-frame or a function that produces a series (given a dataframe).
     *
     * @returns Returns a new dataframe replacing or adding a particular named column.
     */
    withSeries<SeriesValueT> (columnNameOrSpec: string | IColumnGenSpec, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT>;
    
    /**
     * Add a series if it doesn't already exist.
     * 
     * @param columnNameOrSpec - The name of the series to add or a column spec that defines the new column.
     * @param series - The series to add to the dataframe. Can also be a function that returns the series.
     * 
     * @returns Returns a new dataframe with the specified series added, if the series didn't already exist. Otherwise if the requested series already exists the same dataframe is returned.  
     */
    ensureSeries<SeriesValueT> (columnNameOrSpec: string | IColumnGenSpec, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Create a new data-frame from a subset of columns.
     *
     * @param columnNames - Array of column names to include in the new data-frame.
     * 
     * @returns Returns a dataframe with a subset of columns from the input dataframe.
     */
    subset<NewValueT = ValueT> (columnNames: string[]): IDataFrame<IndexT, NewValueT>;

    /**
     * Create a new data frame with the requested column or columns dropped.
     *
     * @param columnOrColumns - Specifies the column name (a string) or columns (array of column names) to drop.
     * 
     * @returns Returns a new dataframe with a particular name column or columns removed.
     */
    dropSeries<NewValueT = ValueT> (columnOrColumns: string | string[]): IDataFrame<IndexT, NewValueT>;

    /**
     * Create a new data frame with columns reordered.
     * New column names create new columns (with undefined values), omitting existing column names causes those columns to be dropped.
     * 
     * @param columnNames - The new order for columns.
     * 
     * @returns Returns a new dataframe with columns remapped according to the specified column layout.   
     */
    reorderSeries<NewValueT = ValueT> (columnNames: string[]): IDataFrame<IndexT, NewValueT>;

    /**
     * Bring the name column (or columns) to the front, making it (or them) the first column(s) in the data-frame.
     *
     * @param columnOrColumns - Specifies the column or columns to bring to the front.
     *
     * @returns Returns a new dataframe with 1 or more columns bought to the front of the column ordering.
     */
    bringToFront (columnOrColumns: string | string[]): IDataFrame<IndexT, ValueT>;

    /**
     * Bring the name column (or columns) to the back, making it (or them) the last column(s) in the data-frame.
     *
     * @param columnOrColumns - Specifies the column or columns to bring to the back.
     *
     * @returns Returns a new dataframe with 1 or more columns bought to the back of the column ordering.
     */
    bringToBack (columnOrColumns: string | string[]): IDataFrame<IndexT, ValueT>;

    /**
     * Create a new data-frame with renamed series.
     *
     * @param newColumnNames - A column rename spec - maps existing column names to new column names.
     * 
     * @returns Returns a new dataframe with columns renamed.
     */
    renameSeries<NewValueT = ValueT> (newColumnNames: IColumnRenameSpec): IDataFrame<IndexT, NewValueT>;

    /**
    * Extract values from the dataframe as an array.
    * This forces lazy evaluation to complete.
    * 
    * @returns Returns an array of values contained within the dataframe. 
    */
    toArray (): ValueT[];

    /**
     * Retreive the index and values from the DataFrame as an array of pairs.
     * Each pairs is [index, value].
     * 
     * @returns Returns an array of pairs that contains the dataframe content. Each pair is a two element array that contains an index and a value.  
     */
    toPairs (): ([IndexT, ValueT])[];

    /**
     * Convert the dataframe to a JavaScript object.
     *
     * @param {function} keySelector - Function that selects keys for the resulting object.
     * @param {valueSelector} keySelector - Function that selects values for the resulting object.
     * 
     * @returns {object} Returns a JavaScript object generated from the input sequence by the key and value selector funtions. 
     */
    toObject<KeyT = any, FieldT = any, OutT = any> (keySelector: (value: ValueT) => KeyT, valueSelector: (value: ValueT) => FieldT): OutT;

    /**
     * Bake the data frame to an array of rows.
     * 
     *  @returns Returns an array of rows. Each row is an array of values in column order.   
     */
    toRows (): any[][];
 
    /**
     * Generate a new dataframe based by calling the selector function on each value.
     *
     * @param selector Selector function that transforms each value to create a new dataframe.
     * 
     * @returns Returns a new dataframe that has been transformed by the selector function.
     */
    select<ToT> (selector: SelectorWithIndexFn<ValueT, ToT>): IDataFrame<IndexT, ToT>;

    /**
     * Generate a new dataframe based on the results of the selector function.
     *
     * @param selector Selector function that transforms each value into a list of values.
     * 
     * @returns  Returns a new dataframe with values that have been produced by the selector function. 
     */
    selectMany<ToT> (selector: SelectorWithIndexFn<ValueT, Iterable<ToT>>): IDataFrame<IndexT, ToT>;

    /**
     * Transform one or more columns. This is equivalent to extracting a column, calling 'select' on it,
     * then plugging it back in as the same column.
     *
     * @param columnSelectors - Object with field names for each column to be transformed. Each field you be a selector that transforms that column.
     * 
     * @returns Returns a new dataframe with 1 or more columns transformed.   
     */
    transformSeries<NewValueT = ValueT> (columnSelectors: IColumnTransformSpec): IDataFrame<IndexT, NewValueT>;

    /** 
     * Generate new columns based on existing rows.
     *
     * @param generator - Generator function that transforms each row to a new set of columns.
     * 
     * @returns Returns a new dataframe with 1 or more new columns.
     */
    generateSeries<NewValueT = ValueT> (generator: SelectorWithIndexFn<any, any> | IColumnTransformSpec): IDataFrame<IndexT, NewValueT>;

    /** 
     * Deflate a data-frame to a series.
     *
     * @param [selector] - Optional selector function that transforms each row to a new sequence of values.
     *
     * @returns Returns a series that was created from the input dataframe.
     */
    deflate<ToT = ValueT> (selector?: SelectorWithIndexFn<ValueT, ToT>): ISeries<IndexT, ToT>;

    /** 
     * Inflate a named series in the data-frame to 1 or more new series in the new dataframe.
     *
     * @param columnName - Name or index of the column to retreive.
     * @param [selector] - Optional selector function that transforms each value in the column to new columns. If not specified it is expected that each value in the column is an object whose fields define the new column names.
     * 
     * @returns Returns a new dataframe with a column inflated to 1 or more new columns.
     */
    inflateSeries<NewValueT = ValueT> (columnName: string, selector?: SelectorWithIndexFn<IndexT, any>): IDataFrame<IndexT, ValueT>;

    /**
     * Segment a dataframe into 'windows'. Returns a new series. Each value in the new dataframe contains a 'window' (or segment) of the original dataframe.
     * Use select or selectPairs to aggregate.
     *
     * @param period - The number of values in the window.
     * 
     * @returns Returns a new series, each value of which is a 'window' (or segment) of the original dataframe.
     */
    window (period: number): ISeries<number, IDataFrame<IndexT, ValueT>>;

    /** 
     * Segment a dataframe into 'rolling windows'. Returns a new series. Each value in the new series contains a 'window' (or segment) of the original dataframe.
    *
     * @param period - The number of values in the window.
     * 
     * @returns Returns a new series, each value of which is a 'window' (or segment) of the original dataframe.
     */
    rollingWindow (period: number): ISeries<number, IDataFrame<IndexT, ValueT>>;

    /**
     * Groups sequential values into variable length 'windows'.
     *
     * @param comparer - Predicate that compares two values and returns true if they should be in the same window.
     * 
     * @returns Returns a series of groups. Each group is itself a dataframe that contains the values in the 'window'. 
     */
    variableWindow (comparer: ComparerFn<ValueT, ValueT>): ISeries<number, IDataFrame<IndexT, ValueT>>;

    /**
     * Collapase distinct values that happen to be sequential.
     *
     * @param [selector] - Optional selector function to determine the value used to compare for duplicates.
     * 
     * @returns Returns a new dataframe with duplicate values that are sequential removed.
     */
    sequentialDistinct<ToT = ValueT> (selector?: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ValueT>;

    /**
     * Aggregate the values in the dataframe.
     *
     * @param [seed] - Optional seed value for producing the aggregation.
     * @param selector - Function that takes the seed and then each value in the dataframe and produces the aggregate value.
     * 
     * @returns Returns a new value that has been aggregated from the input sequence by the 'selector' function. 
     */
    aggregate<ToT = ValueT> (seedOrSelector: AggregateFn<ValueT, ToT> | ToT | IColumnAggregateSpec, selector?: AggregateFn<ValueT, ToT>): ToT;
    
    /**
     * Skip a number of values in the dataframe.
     *
     * @param numValues - Number of values to skip.     * 
     * @returns Returns a new dataframe or dataframe with the specified number of values skipped. 
     */
    skip (numValues: number): IDataFrame<IndexT, ValueT>;

    /**
     * Skips values in the series while a condition is met.
     *
     * @param predicate - Return true to indicate the condition met.
     * 
     * @returns Returns a new series with all initial sequential values removed that match the predicate.  
     */
    skipWhile (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Skips values in the series until a condition is met.
     *
     * @param predicate - Return true to indicate the condition met.
     * 
     * @returns Returns a new series with all initial sequential values removed that don't match the predicate.
     */
    skipUntil (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Take a number of rows in the series.
     *
     * @param numRows - Number of rows to take.
     * 
     * @returns Returns a new series with up to the specified number of values included.
     */
    take (numRows: number): IDataFrame<IndexT, ValueT>;

    /**
     * Take values from the series while a condition is met.
     *
     * @param predicate - Return true to indicate the condition met.
     * 
     * @returns Returns a new series that only includes the initial sequential values that have matched the predicate.
     */
    takeWhile (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Take values from the series until a condition is met.
     *
     * @param predicate - Return true to indicate the condition met.
     * 
     * @returns Returns a new series or dataframe that only includes the initial sequential values that have not matched the predicate.
     */
    takeUntil (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Count the number of values in the series.
     *
     * @returns Returns the count of all values in the series.
     */
    count (): number;

    /**
     * Get the first value of the series.
     *
     * @returns Returns the first value of the series.
     */
    first (): ValueT;

    /**
     * Get the last value of the series.
     *
     * @returns Returns the last value of the series.
     */
    last (): ValueT;
    
    /**
     * Get the value at a specified index.
     *
     * @param index - Index to for which to retreive the value.
     *
     * @returns Returns the value from the specified index in the sequence or undefined if there is no such index in the series.
     */
    at (index: IndexT): ValueT | undefined;
    
    /** 
     * Get X values from the start of the series.
     *
     * @param numValues - Number of values to take.
     * 
     * @returns Returns a new series that has only the specified number of values taken from the start of the input sequence.  
     */
    head (numValues: number): IDataFrame<IndexT, ValueT>;

    /** 
     * Get X values from the end of the series.
     *
     * @param numValues - Number of values to take.
     * 
     * @returns Returns a new series that has only the specified number of values taken from the end of the input sequence.  
     */
    tail (numValues: number): IDataFrame<IndexT, ValueT>;

    /**
     * Filter a series by a predicate selector.
     *
     * @param predicate - Predicte function to filter rows of the series.
     * 
     * @returns Returns a new series containing only the values that match the predicate. 
     */
    where (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Invoke a callback function for each value in the series.
     *
     * @param callback - The calback to invoke for each value.
     * 
     * @returns Returns the input series with no modifications.
     */
    forEach (callback: CallbackFn<ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Determine if the predicate returns truthy for all values in the series.
     * Returns false as soon as the predicate evaluates to falsy.
     * Returns true if the predicate returns truthy for all values in the series.
     * Returns false if the series is empty.
     *
     * @param predicate - Predicate function that receives each value in turn and returns truthy for a match, otherwise falsy.
     *
     * @returns {boolean} Returns true if the predicate has returned truthy for every value in the sequence, otherwise returns false. 
     */
    all (predicate: PredicateFn<ValueT>): boolean;

    /**
     * Determine if the predicate returns truthy for any of the values in the series.
     * Returns true as soon as the predicate returns truthy.
     * Returns false if the predicate never returns truthy.
     * If no predicate is specified the value itself is checked. 
     *
     * @param [predicate] - Optional predicate function that receives each value in turn and returns truthy for a match, otherwise falsy.
     *
     * @returns Returns true if the predicate has returned truthy for any value in the sequence, otherwise returns false. 
     */
    any (predicate?: PredicateFn<ValueT>): boolean;

    /**
     * Determine if the predicate returns truthy for none of the values in the series.
     * Returns true for an empty series.
     * Returns true if the predicate always returns falsy.
     * Otherwise returns false.
     * If no predicate is specified the value itself is checked.
     *
     * @param [predicate] - Optional predicate function that receives each value in turn and returns truthy for a match, otherwise falsy.
     * 
     * @returns Returns true if the predicate has returned truthy for no values in the series, otherwise returns false. 
     */
    none (predicate?: PredicateFn<ValueT>): boolean;

    /**
     * Get a new series containing all values starting at and after the specified index value.
     * 
     * @param indexValue - The index value to search for before starting the new series.
     * 
     * @returns Returns a new series containing all values starting at and after the specified index value. 
     */
    startAt (indexValue: IndexT): IDataFrame<IndexT, ValueT>;

    /**
     * Get a new series containing all values up until and including the specified index value (inclusive).
     * 
     * @param indexValue - The index value to search for before ending the new series.
     * 
     * @returns Returns a new series containing all values up until and including the specified index value. 
     */
    endAt (indexValue: IndexT): IDataFrame<IndexT, ValueT>;

    /**
     * Get a new series containing all values up to the specified index value (exclusive).
     * 
     * @param indexValue - The index value to search for before ending the new series.
     * 
     * @returns Returns a new series containing all values up to the specified inde value. 
     */
    before (indexValue: IndexT): IDataFrame<IndexT, ValueT>;

    /**
     * Get a new series containing all values after the specified index value (exclusive).
     * 
     * @param indexValue - The index value to search for.
     * 
     * @returns Returns a new series containing all values after the specified index value.
     */
    after (indexValue: IndexT): IDataFrame<IndexT, ValueT>;

    /**
     * Get a new dataframe containing all values between the specified index values (inclusive).
     * 
     * @param startIndexValue - The index where the new sequence starts. 
     * @param endIndexValue - The index where the new sequence ends.
     * 
     * @returns Returns a new dataframe containing all values between the specified index values (inclusive).
     */
    between (startIndexValue: IndexT, endIndexValue: IndexT): IDataFrame<IndexT, ValueT>;

    /** 
     * Format the dataframe for display as a string.
     * This forces lazy evaluation to complete.
     * 
     * @returns Generates and returns a string representation of the dataframe or dataframe.
     */
    toString (): string;

    /**
     * Parse a column with string values to a column with int values.
     *
     * @param columnNameOrNames - Specifies the column name or array of column names to parse.
     * 
     * @returns Returns a new dataframe with a particular named column parsed as ints.  
     */
    parseInts (columnNameOrNames: string | string[]): IDataFrame<IndexT, ValueT>;

    /**
     * Parse a column with string values to a column with float values.
     *
     * @param columnNameOrNames - Specifies the column name or array of column names to parse.
     * 
     * @returns  Returns a new dataframe with a particular named column parsed as floats.  
     */
    parseFloats (columnNameOrNames: string | string[]): IDataFrame<IndexT, ValueT>;

    /**
     * Parse a column with string values to a column with date values.
     *
     * @param columnNameOrNames - Specifies the column name or array of column names to parse.
     * @param [formatString] - Optional formatting string for dates.
     * 
     * @returns Returns a new dataframe with a particular named column parsed as dates.  
     */
    parseDates (columnNameOrNames: string | string[], formatString?: string): IDataFrame<IndexT, ValueT>;

    /**
     * Convert a column of values of different types to a column of string values.
     *
     * @param columnNames - Specifies the column name or array of column names to convert to strings. Can also be a format spec that specifies which columns to convert and what their format should be. 
     * @param [formatString] - Optional formatting string for dates.
     * 
     * Numeral.js is used for number formatting.
     * http://numeraljs.com/
     * 
     * Moment is used for date formatting.
     * https://momentjs.com/docs/#/parsing/string-format/

     * @returns Returns a new dataframe with a particular named column convert to strings.  
     */
    toStrings (columnNames: string | string[] | IFormatSpec, formatString?: string): IDataFrame<IndexT, ValueT>;    

    /**
     * Produces a new data frame with all string values truncated to the requested maximum length.
     *
     * @param maxLength - The maximum length of the string values after truncation.
     * 
     * @returns Returns a new dataframe with all strings truncated to the specified maximum length.
     */
    truncateStrings (maxLength: number): IDataFrame<IndexT, ValueT>;

    /**
     * Forces lazy evaluation to complete and 'bakes' the dataframe into memory.
     * 
     * @returns Returns a dataframe that has been 'baked', all lazy evaluation has completed.  
     */
    bake (): IDataFrame<IndexT, ValueT>;

    /** 
     * Reverse the dataframe.
     * 
     * @returns Returns a new dataframe that is the reverse of the input.
     */
    reverse (): IDataFrame<IndexT, ValueT>;

    /**
     * Returns only values in the dataframe that have distinct values.
     *
     * @param selector - Selects the value used to compare for duplicates.
     * 
     * @returns Returns a dataframe containing only unique values as determined by the 'selector' function. 
     */
    distinct<ToT> (selector?: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ValueT>;

    /**
     * Group the dataframe according to the selector.
     *
     * @param selector - Selector that defines the value to group by.
     *
     * @returns Returns a series of groups. Each group is a dataframe with values that have been grouped by the 'selector' function.
     */
    groupBy<GroupT> (selector: SelectorWithIndexFn<ValueT, GroupT>): ISeries<number, IDataFrame<IndexT, ValueT>>;
    
    /**
     * Group sequential values into a series of windows.
     *
     * @param selector - Optional selector that defines the value to group by.
     *
     * @returns Returns a series of groups. Each group is a series with values that have been grouped by the 'selector' function.
     */
    groupSequentialBy<GroupT> (selector?: SelectorFn<ValueT, GroupT>): ISeries<number, IDataFrame<IndexT, ValueT>>;
    
    /**
     * Concatenate multiple other dataframes onto this dataframe.
     * 
     * @param dataframes - Multiple arguments. Each can be either a dataframe or an array of dataframes.
     * 
     * @returns Returns a single dataframe concatenated from multiple input dataframes. 
     */    
    concat (...dataframes: (IDataFrame<IndexT, ValueT>[] | IDataFrame<IndexT, ValueT>)[]): IDataFrame<IndexT, ValueT>;
    
    /**
    * Zip together multiple dataframes to create a new dataframe.
    * Preserves the index of the first dataframe.
    * 
    * @param s2, s3, s4, s4 - Multiple dataframes to zip.
    * @param zipper - Zipper function that produces a new dataframe based on the input dataframes.
    * 
    * @returns Returns a single dataframe concatenated from multiple input dataframes. 
    */    
    zip<Index2T, Value2T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, zipper: Zip2Fn<ValueT, Value2T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<Index2T, Value2T, Index3T, Value3T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, s3: IDataFrame<Index3T, Value3T>, zipper: Zip3Fn<ValueT, Value2T, Value3T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<Index2T, Value2T, Index3T, Value3T, Index4T, Value4T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, s3: IDataFrame<Index3T, Value3T>, s4: IDataFrame<Index4T, Value4T>, zipper: Zip3Fn<ValueT, Value2T, Value3T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<ResultT>  (...args: any[]): IDataFrame<IndexT, ResultT>;

    /**
     * Sorts the dataframe by a value defined by the selector (ascending). 
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new ordered dataframe that has been sorted by the value returned by the selector. 
     */
    orderBy<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT>;

    /**
     * Sorts the dataframe by a value defined by the selector (descending). 
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new ordered dataframe that has been sorted by the value returned by the selector. 
     */
    orderByDescending<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT>;
        
    /**
     * Returns the unique union of values between two dataframes.
     *
     * @param other - The other dataframe to combine.
     * @param [selector] - Optional function that selects the value to compare to detemrine distinctness.
     * 
     * @returns Returns the union of two dataframes.
     */
    union<KeyT = ValueT> (
        other: IDataFrame<IndexT, ValueT>, 
        selector?: SelectorFn<ValueT, KeyT>): 
            IDataFrame<IndexT, ValueT>;

    /**
     * Returns the intersection of values between two dataframes.
     *
     * @param inner - The other dataframes to combine.
     * @param [outerSelector] - Optional function to select the key for matching the two dataframes.
     * @param [innerSelector] - Optional function to select the key for matching the two dataframes.
     * 
     * @returns Returns the intersection of two dataframes.
     */
    intersection<InnerIndexT = IndexT, InnerValueT = ValueT, KeyT = ValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerSelector?: SelectorFn<ValueT, KeyT>,
        innerSelector?: SelectorFn<InnerValueT, KeyT>): 
            IDataFrame<IndexT, ValueT>;
    

    /**
     * Returns the exception of values between two dataframes.
     *
     * @param inner - The other dataframe to combine.
     * @param [outerSelector] - Optional function to select the key for matching the two dataframes.
     * @param [innerSelector] - Optional function to select the key for matching the two dataframes.
     * 
     * @returns Returns the difference between the two dataframes.
     */
    except<InnerIndexT = IndexT, InnerValueT = ValueT, KeyT = ValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerSelector?: SelectorFn<ValueT, KeyT>,
        innerSelector?: SelectorFn<InnerValueT, KeyT>): 
            IDataFrame<IndexT, ValueT>;

   /**
     * Correlates the elements of two dataframes on matching keys.
     *
     * @param this - The outer dataframe to join. 
     * @param inner - The inner dataframe to join.
     * @param outerKeySelector - Selector that chooses the join key from the outer sequence.
     * @param innerKeySelector - Selector that chooses the join key from the inner sequence.
     * @param resultSelector - Selector that defines how to merge outer and inner values.
     * 
     * @returns Returns the joined dataframe. 
     */
    join<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT, InnerValueT, ResultValueT>):
            IDataFrame<number, ResultValueT>;

    /**
     * Performs an outer join on two dataframes. Correlates the elements based on matching keys.
     * Includes elements from both dataframes that have no correlation in the other dataframe.
     *
     * @param this - The outer dataframe to join. 
     * @param inner - The inner dataframe to join.
     * @param outerKeySelector - Selector that chooses the join key from the outer sequence.
     * @param innerKeySelector - Selector that chooses the join key from the inner sequence.
     * @param resultSelector - Selector that defines how to merge outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the joined dataframe. 
     */
    joinOuter<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT>;
    

    /**
     * Performs a left outer join on two dataframe. Correlates the elements based on matching keys.
     * Includes left elements that have no correlation.
     *
     * @param this - The outer dataframe to join. 
     * @param inner - The inner dataframe to join.
     * @param outerKeySelector - Selector that chooses the join key from the outer sequence.
     * @param innerKeySelector - Selector that chooses the join key from the inner sequence.
     * @param resultSelector - Selector that defines how to merge outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the joined dataframe. 
     */
    joinOuterLeft<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT>;

    /**
     * Performs a right outer join on two dataframes. Correlates the elements based on matching keys.
     * Includes right elements that have no correlation.
     *
     * @param this - The outer dataframe to join. 
     * @param inner - The inner dataframe to join.
     * @param outerKeySelector - Selector that chooses the join key from the outer sequence.
     * @param innerKeySelector - Selector that chooses the join key from the inner sequence.
     * @param resultSelector - Selector that defines how to merge outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the joined dataframe. 
     */
    joinOuterRight<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT>;

    /**
     * Reshape (or pivot) a table based on column values.
     * This effiectively a short-hand for multiple grouping operations and an aggregation.
     *
     * @param columnOrColumns - Column name whose values make the new DataFrame's columns.
     * @param valueColumnNameOrSpec - Column name or column spec that defines the columns whose values should be aggregated.
     * @param [aggregator] - Optional function used to aggregate pivotted vales. 
     *
     * @returns Returns a new dataframe that has been pivoted based on a particular column's values. 
     */
    pivot<NewValueT = ValueT> (
        columnOrColumns: string | Iterable<string>, 
        valueColumnNameOrSpec: string | IPivotAggregateSpec, 
        aggregator?: (values: ISeries<number, any>) => any
            ): IDataFrame<number, NewValueT>;

    /**
     * Insert a pair at the start of the dataframe.
     *
     * @param pair - The pair to insert.
     * 
     * @returns Returns a new dataframe with the specified pair inserted.
     */
    insertPair (pair: [IndexT, ValueT]): IDataFrame<IndexT, ValueT>;

    /**
     * Append a pair to the end of a dataframe.
     *
     * @param pair - The pair to append.
     *  
     * @returns Returns a new dataframe with the specified pair appended.
     */
    appendPair (pair: [IndexT, ValueT]): IDataFrame<IndexT, ValueT>;

    /**
     * Fill gaps in a dataframe.
     *
     * @param comparer - Comparer that is passed pairA and pairB, two consecutive rows, return truthy if there is a gap between the rows, or falsey if there is no gap.
     * @param generator - Generator that is passed pairA and pairB, two consecutive rows, returns an array of pairs that fills the gap between the rows.
     *
     * @returns Returns a new dataframe with gaps filled in.
     */
    fillGaps (comparer: ComparerFn<[IndexT, ValueT], [IndexT, ValueT]>, generator: GapFillFn<[IndexT, ValueT], [IndexT, ValueT]>): IDataFrame<IndexT, ValueT>;

    /**
     * Returns the specified default sequence if the dataframe is empty. 
     *
     * @param defaultSequence - Default sequence to return if the dataframe is empty.
     * 
     * @returns Returns 'defaultSequence' if the dataframe is empty. 
     */
    defaultIfEmpty (defaultSequence: ValueT[] | IDataFrame<IndexT, ValueT>): IDataFrame<IndexT, ValueT>;

    /**
     * Detect the types of the values in the dataframe.
     *
     * @returns Returns a dataframe that describes the data types contained in the input series or dataframe.
     */
    detectTypes (): IDataFrame<number, ITypeFrequency>;

    /**
     * Detect the frequency of the values in the dataframe.
     *
     * @returns Returns a dataframe that describes the values contained in the dataframe.
     */
    detectValues (): IDataFrame<number, IValueFrequency>;

    /**
     * Serialize the dataframe to JSON.
     * 
     *  @returns Returns a JSON format string representing the dataframe.   
     */
    toJSON (): string;

    /**
     * Serialize the dataframe to CSV.
     * 
     *  @returns Returns a CSV format string representing the dataframe.   
     */
    toCSV (): string;

    /**
     * Treat the dataframe as CSV data for purposes of serialization.
     * 
     * @returns Returns an object that represents the dataframe for serialization in the CSV format. Call `writeFile`, `writeFileSync` to output the dataframe via different media.
     */
    asCSV (): ICsvSerializer;

    /**
     * Treat the dataframe as JSON data for purposes of serialization.
     * 
     * @returns Returns an object that can serialize the dataframe in the JSON format. Call `writeFile` or `writeFileSync` to output the dataframe via different media.
     */
    asJSON (): IJsonSerializer;

    /**
     * Serialize the dataframe to HTML.
     * 
     *  @returns Returns a HTML format string representing the dataframe.   
     */
    toHTML (): string;
    
    /**
     * Serialize the dataframe to an ordinary JavaScript data structure.
     */
    serialize (): any;
}

/**
 * Interface to a dataframe that has been ordered.
 */
export interface IOrderedDataFrame<IndexT = number, ValueT = any, SortT = any> extends IDataFrame<IndexT, ValueT> {

    /** 
     * Performs additional sorting (ascending).
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new dataframe has been additionally sorted by the value returned by the selector. 
     */
    thenBy<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT>;

    /** 
     * Performs additional sorting (descending).
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new dataframe has been additionally sorted by the value returned by the selector. 
     */
    thenByDescending<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT>;
}

//
// Represents the contents of a dataframe.
//
interface IDataFrameContent<IndexT, ValueT> {
    index: Iterable<IndexT>;
    values: Iterable<ValueT>;
    pairs: Iterable<[IndexT, ValueT]>;

    columnNames: string[] | Iterable<string>,
    isBaked: boolean,
}

/**
 * Class that represents a dataframe.
 * A dataframe contains an indexed sequence of data records.
 * Think of it as a spreadsheet or CSV file in memory.
 * 
 * Each data record contains multiple named fields, the value of each field represents one row in a column of data.
 * Each column of data is a named {@link Series}.
 * You think of a dataframe a collection of named data series.
 * 
 * @typeparam IndexT The type to use for the index.
 * @typeparam ValueT The type to use for each row/data record.
 */
export class DataFrame<IndexT = number, ValueT = any> implements IDataFrame<IndexT, ValueT> {

    //
    // Function to lazy evaluate the configuration of the dataframe.
    //
    private configFn: DataFrameConfigFn<IndexT, ValueT> | null = null;
    
    //
    // The content of the dataframe.
    // When this is null it means the dataframe is yet to be lazy initialised.
    //
    private content: IDataFrameContent<IndexT, ValueT> | null = null;
    
    private static readonly defaultCountIterable = new CountIterable();
    private static readonly defaultEmptyIterable = new EmptyIterable();
    
    //
    // Initialise dataframe content from an iterable of values.
    //
    private static initFromArray<IndexT, ValueT>(arr: Iterable<ValueT>): IDataFrameContent<IndexT, ValueT> {
        const firstResult = arr[Symbol.iterator]().next();
        const columnNames = !firstResult.done ? Object.keys(firstResult.value) : [];
        return {
            index: DataFrame.defaultCountIterable,
            values: arr,
            pairs: new MultiIterable([DataFrame.defaultCountIterable, arr]),
            isBaked: true,
            columnNames: columnNames,
        };
    }

    //
    // Initialise an empty dataframe.
    //
    private static initEmpty<IndexT, ValueT>(): IDataFrameContent<IndexT, ValueT> {
        return {
            index: DataFrame.defaultEmptyIterable,
            values: DataFrame.defaultEmptyIterable,
            pairs: DataFrame.defaultEmptyIterable,
            isBaked: true,
            columnNames: [],
        };
    }

    //
    // Initialise dataframe column names.
    //
    private static initColumnNames(inputColumnNames: Iterable<string>): Iterable<string> {
        const outputColumnNames: string[] = [];
        const columnNamesMap: any = {};
    
        // Search for duplicate column names.
        for (const columnName of inputColumnNames) {
            const columnNameLwr = columnName.toLowerCase();
            if (columnNamesMap[columnNameLwr] === undefined) {
                columnNamesMap[columnNameLwr] = 1;
            }
            else {
                columnNamesMap[columnNameLwr] += 1;
            }
        }

        const columnNoMap: any = {};

        for (const columnName of inputColumnNames) {
            const columnNameLwr = columnName.toLowerCase();
            if (columnNamesMap[columnNameLwr] > 1) {
                let curColumnNo = 1;

                // There are duplicates of this column.
                if (columnNoMap[columnNameLwr] !== undefined) {
                    curColumnNo = columnNoMap[columnNameLwr];
                }

                outputColumnNames.push(columnName + "." + curColumnNo);
                columnNoMap[columnNameLwr] = curColumnNo + 1;
            }
            else {
                // No duplicates.
                outputColumnNames.push(columnName);
            }
        }

        return outputColumnNames;
    }

    //
    // Check that a value is an interable.
    //
    private static checkIterable<T>(input: T[] | Iterable<T>, fieldName: string): void {
        if (Sugar.Object.isArray(input)) {
            // Ok
        }
        else if (Sugar.Object.isFunction(input[Symbol.iterator])) {
            // Assume it's an iterable.
            // Ok
        }
        else {
            // Not ok
            throw new Error("Expected '" + fieldName + "' field of DataFrame config object to be an array of values or an iterable of values.");
        }
    };

    //
    // Initialise dataframe content from a config object.
    //
    private static initFromConfig<IndexT, ValueT>(config: IDataFrameConfig<IndexT, ValueT>): IDataFrameContent<IndexT, ValueT> {

        let index: Iterable<IndexT>;
        let values: Iterable<ValueT>;
        let pairs: Iterable<[IndexT, ValueT]> | undefined;
        let isBaked = false;
        let columnNames: Iterable<string>;

        if (config.pairs) {
            DataFrame.checkIterable<[IndexT, ValueT]>(config.pairs, "pairs");
            pairs = config.pairs;
        }
        
        if (config.columns) {
            let columnsConfig: any = config.columns;

            if (Sugar.Object.isArray(columnsConfig) ||
                Sugar.Object.isFunction((columnsConfig as any)[Symbol.iterator])) {

                const iterableColumnsConfig = columnsConfig as Iterable<IColumnConfig>;
                columnNames = Array.from(iterableColumnsConfig).map(column => column.name);
                columnsConfig = toMap(iterableColumnsConfig, column => column.name, column => column.series);
            }
            else {
                assert.isObject(columnsConfig, "Expected 'columns' member of 'config' parameter to DataFrame constructor to be an object with fields that define columns.");

                columnNames = Object.keys(columnsConfig);
            }

            let columnIterables: any[] = [];
            for (let columnName of columnNames) {
                DataFrame.checkIterable(columnsConfig[columnName], columnName);
                columnIterables.push(columnsConfig[columnName]);
            }

            values = new CsvRowsIterable(columnNames, new MultiIterable(columnIterables));
        }
        else {
            if (config.columnNames) {
                columnNames = this.initColumnNames(config.columnNames);
            }

            if (config.rows) {
                if (!config.columnNames) {
                    columnNames = new SelectIterable(new CountIterable(), c => "Column." + c.toString());
                }

                DataFrame.checkIterable<any[][]>(config.rows, 'rows')
                values = new CsvRowsIterable(columnNames!, config.rows); // Convert data from rows to columns.
            }
            else if (config.values) {
                DataFrame.checkIterable<ValueT>(config.values, 'values')
                values = config.values;
                if (!config.columnNames) {
                    columnNames = new ColumnNamesIterable(values, config.considerAllRows || false);
                }
            }
            else if (pairs) {
                values = new ExtractElementIterable(pairs, 1);
                if (!config.columnNames) {
                    columnNames = new ColumnNamesIterable(values, config.considerAllRows || false);
                }
            }
            else {
                values = DataFrame.defaultEmptyIterable;
                if (!config.columnNames) {
                    columnNames = DataFrame.defaultEmptyIterable;
                }
            }
        }

        if (config.index) {
            DataFrame.checkIterable<IndexT>(config.index, 'index');
            index = config.index;
        }
        else if (pairs) {
            index = new ExtractElementIterable(pairs, 0);
        }
        else {
            index = DataFrame.defaultCountIterable;
        }

        if (!pairs) {
            pairs = new MultiIterable([index, values]);
        }

        if (config.baked !== undefined) {
            isBaked = config.baked;
        }

        return {
            index: index,
            values: values,
            pairs: pairs,
            isBaked: isBaked,
            columnNames: columnNames!,
        };
    }

    /**
     * Create a dataframe.
     * 
     * @param config This can be an array, a configuration object or a function that lazily produces a configuration object. 
     * 
     * It can be an array that specifies the data records that the dataframe contains.
     * 
     * It can be a {@link IDataFrameConfig} that defines the data and configuration of the dataframe.
     * 
     * Or it can be a function that lazily produces a {@link IDataFrameConfig}.
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame();
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame([10, 20, 30, 40]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ index: [1, 2, 3, 4], values: [10, 20, 30, 40]});
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const lazyInit = () => ({ index: [1, 2, 3, 4], values: [10, 20, 30, 40] });
     * const df = new DataFrame(lazyInit);
     * </pre>
     */
    constructor(config?: Iterable<ValueT> | IDataFrameConfig<IndexT, ValueT> | DataFrameConfigFn<IndexT, ValueT>) {
        if (config) {
            if (Sugar.Object.isFunction(config)) {
                this.configFn = config;
            }
            else if (Sugar.Object.isArray(config) || 
                     Sugar.Object.isFunction((config as any)[Symbol.iterator])) {
                this.content = DataFrame.initFromArray(config as Iterable<ValueT>);
            }
            else {
                this.content = DataFrame.initFromConfig(config as IDataFrameConfig<IndexT, ValueT>);
            }
        }
        else {
            this.content = DataFrame.initEmpty();
        }
    }

    //
    // Ensure the dataframe content has been initialised.
    //
    private lazyInit() {
        if (this.content === null && this.configFn !== null) {
            this.content = DataFrame.initFromConfig(this.configFn());
        }
    }

    //
    // Ensure the dataframe content is lazy initalised and return it.
    //
    private getContent(): IDataFrameContent<IndexT, ValueT> { 
        this.lazyInit();
        return this.content!;
    }
    
    /**
     * Get an iterator to enumerate the values of the dataframe.
     * Enumerating the iterator forces lazy evaluation to complete.
     * This function is automatically called by `for...of`.
     * 
     * @returns An iterator for the dataframe.
     * 
     * @example
     * <pre>
     * 
     * for (const row of df) {
     *     // ... do something with the row ...
     * }
     * </pre>
     */
    [Symbol.iterator](): Iterator<any> {
        return this.getContent().values[Symbol.iterator]();
    }

    /**
     * Get the names of the columns in the dataframe.
     * 
     * @returns Returns an array of the column names in the dataframe.  
     * 
     * @example
     * <pre>
     * 
     * console.log(df.getColumnNames());
     * </pre>
     */
    getColumnNames (): string[] {
        return Array.from(this.getContent().columnNames);
    }

    /** 
     * Retreive the collection of all columns in the dataframe.
     * 
     * @returns Returns a {@link Series} containing the names of the columns in the dataframe.
     * 
     * @example
     * <pre>
     * 
     * for (const column in df.getColummns()) {
     *      console.log("Column name: ");
     *      console.log(column.name);
     * 
     *      console.log("Data:");
     *      console.log(column.series.toArray());
     * }
     * </pre>
     */
    getColumns (): ISeries<number, IColumn> {
        return new Series<number, IColumn>(() => {
            const columnNames = this.getColumnNames();
            return {
                values: columnNames.map(columnName => {
                    const series = this.getSeries(columnName);
                    return {
                        name: columnName,
                        type: determineType(series.first()), //TODO: Should cache the type.
                        series: series,
                    };
                }),
            };
        });
    }    

    /**
     * Cast the value of the dataframe to a new type.
     * This operation has no effect but to retype the value that the dataframe contains.
     * 
     * @returns The same dataframe, but with the type changed.
     * 
     * @example
     * <pre>
     * 
     * const castDf = df.cast<SomeOtherType>();
     * </pre>
     */
    cast<NewValueT> (): IDataFrame<IndexT, NewValueT> {
        return this as any as IDataFrame<IndexT, NewValueT>;
    }
    
    /**
     * Get the index for the dataframe.
     * 
     * @returns The {@link Index} for the dataframe.
     * 
     * @example
     * <pre>
     * 
     * const index = df.getIndex();
     * </pre>
     */
    getIndex (): IIndex<IndexT> {
        return new Index<IndexT>(() => ({ values: this.getContent().index }));
    }

    /**
     * Set a named column as the {@link Index} of the dataframe.
     *
     * @param columnName Name of the column to use as the new {@link Index} of the returned dataframe.
     *
     * @returns Returns a new dataframe with the values of the specified column as the new {@link Index}.
     * 
     * @example
     * <pre>
     * 
     * const indexedDf = df.setIndex("SomeColumn");
     * </pre>
     */
    setIndex<NewIndexT = any> (columnName: string): IDataFrame<NewIndexT, ValueT> {
        assert.isString(columnName, "Expected 'columnName' parameter to 'DataFrame.setIndex' to be a string that specifies the name of the column to set as the index for the dataframe.");

        return this.withIndex<NewIndexT>(this.getSeries(columnName));
    }
    
    /**
     * Apply a new {@link Index} to the dataframe.
     * 
     * @param newIndex The new array or iterable to be the new {@link Index} of the dataframe. Can also be a selector to choose the {@link Index} for each row in the dataframe.
     * 
     * @returns Returns a new dataframe or dataframe with the specified {@link Index} attached.
     * 
     * @example
     * <pre>
     * 
     * const indexedDf = df.withIndex([10, 20, 30]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const indexedDf = df.withIndex(df.getSeries("SomeColumn"));
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const indexedDf = df.withIndex(row => row.SomeColumn);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const indexedDf = df.withIndex(row => row.SomeColumn + 20);
     * </pre>
     */
    withIndex<NewIndexT> (newIndex: Iterable<NewIndexT> | SelectorFn<ValueT, NewIndexT>): IDataFrame<NewIndexT, ValueT> {

        if (Sugar.Object.isFunction(newIndex)) {
            return new DataFrame<NewIndexT, ValueT>(() => {
                const content = this.getContent();
                return {
                    columnNames: content.columnNames,
                    values: content.values,
                    index: this.deflate(newIndex),
                };
            });
        }
        else {
            DataFrame.checkIterable(newIndex, 'newIndex');

            return new DataFrame<NewIndexT, ValueT>(() => {
                const content = this.getContent();
                return {
                    columnNames: content.columnNames,
                    values: content.values,
                    index: newIndex,    
                };
            });
        }
    }

    /**
     * Resets the {@link Index} of the dataframe back to the default zero-based sequential integer index.
     * 
     * @returns Returns a new dataframe with the {@link Index} reset to the default zero-based index. 
     * 
     * @example
     * <pre>
     * 
     * const dfWithResetIndex = df.resetIndex();
     * </pre>
     */
    resetIndex (): IDataFrame<number, ValueT> {
        return new DataFrame<number, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: content.values,
                // Strip the index.
            };
        });
    }
    
    /**
     * Extract a {@link Series} from a named column in the dataframe.
     *
     * @param columnName Specifies the name of the column that contains the {@link Series} to retreive.
     * 
     * @returns Returns the {@link Series} extracted from the named column in the dataframe.
     * 
     * @example
     * <pre>
     * 
     * const series = df.getSeries("SomeColumn");
     * </pre>
     */
    getSeries<SeriesValueT = any> (columnName: string): ISeries<IndexT, SeriesValueT> {

        assert.isString(columnName, "Expected 'columnName' parameter to 'DataFrame.getSeries' function to be a string that specifies the name of the column to retreive.");

        return new Series<IndexT, SeriesValueT>(() => ({
            values: new SelectIterable<ValueT, SeriesValueT>(
                this.getContent().values, 
                (row: any) => row[columnName],
            ),
            index: this.getContent().index,
        }));
    }

    /**
     * Determine if the dataframe contains a {@link Series} the specified named column.
     *
     * @param columnName Name of the column to check for.
     * 
     * @returns Returns true if the dataframe contains the requested {@link Series}, otherwise returns false.
     * 
     * @example
     * <pre>
     * 
     * if (df.hasSeries("SomeColumn")) {
     *      // ... the dataframe contains a series with the specified column name ...
     * }
     * </pre>
     */
    hasSeries (columnName: string): boolean {
        const columnNameLwr = columnName.toLowerCase();
        for (let existingColumnName of this.getColumnNames()) {
            if (existingColumnName.toLowerCase() === columnNameLwr) {
                return true;
            }
        }

        return false;
    }
    
    /**
     * 
     * Verify the existence of a name column and extracts the {@link Series} for it.
     * Throws an exception if the requested column doesn't exist.
     *
     * @param columnName Name of the column to extract.
     * 
     * @returns Returns the {@link Series} for the column if it exists, otherwise it throws an exception.
     * 
     * @example
     * <pre>
     * 
     * try {
     *      const series = df.expectSeries("SomeColumn");
     *      // ... do something with the series ...
     * }
     * catch (err) {
     *      // ... the dataframe doesn't contain the column "SomeColumn" ...
     * }
     * </pre>
     */
    expectSeries<SeriesValueT> (columnName: string): ISeries<IndexT, SeriesValueT> {
        if (!this.hasSeries(columnName)) {
            throw new Error("Expected dataframe to contain series with column name: '" + columnName + "'.");
        }

        return this.getSeries(columnName);
    }

    /**
     * Create a new dataframe with a replaced or additional column specified by the passed-in series.
     *
     * @param columnNameOrSpec The name of the column to add or replace or a {@link IColumnGenSpec} that defines the columns to add.
     * @param [series] When columnNameOrSpec is a string that identifies the column to add, this specifies the {@link Series} to add to the dataframe or a function that produces a series (given a dataframe).
     *
     * @returns Returns a new dataframe replacing or adding a particular named column.
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.withSeries("ANewColumn", new Series([1, 2, 3]));
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.withSeries("ANewColumn", df => 
     *      df.getSeries("SourceData").select(aTransformation)
     * );
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.withSeries({
     *      ANewColumn: new Series([1, 2, 3]),
     *      SomeOtherColumn: new Series([10, 20, 30])
     * });
     * <pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.withSeries({
     *      ANewColumn: df => df.getSeries("SourceData").select(aTransformation))
     * });
     * <pre>
     */
    withSeries<SeriesValueT> (columnNameOrSpec: string | IColumnGenSpec, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT> {

        if (!Sugar.Object.isObject(columnNameOrSpec)) {
            assert.isString(columnNameOrSpec, "Expected 'columnNameOrSpec' parameter to 'DataFrame.withSeries' function to be a string that specifies the column to set or replace.");
            if (!Sugar.Object.isFunction(series as Object)) {
                assert.isObject(series, "Expected 'series' parameter to 'DataFrame.withSeries' to be a Series object or a function that takes a dataframe and produces a Series.");
            }
        }
        else {
            assert.isUndefined(series, "Expected 'series' parameter to 'DataFrame.withSeries' to not be set when 'columnNameOrSpec is an object.");
        }

        if (Sugar.Object.isObject(columnNameOrSpec)) {
            const columnSpec: IColumnGenSpec = <IColumnGenSpec> columnNameOrSpec;
            const columnNames = Object.keys(columnSpec);
            let workingDataFrame: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNames) {
                workingDataFrame = workingDataFrame.withSeries(columnName, columnSpec[columnName]);
            }

            return workingDataFrame;
        }

        const columnName: string = <string> columnNameOrSpec;

        if (this.none()) { // We have an empty data frame.
            let importSeries: ISeries<IndexT, SeriesValueT>;
    
            if (Sugar.Object.isFunction(series as Object)) {
                importSeries = (series! as SeriesSelectorFn<IndexT, ValueT, SeriesValueT>)(this);
            }
            else { 
                importSeries = series! as ISeries<IndexT, SeriesValueT>;
            }
                
            
            return importSeries.inflate<ValueT>(value => {
                    var row: any = {};
                    row[columnName] = value;
                    return row;
                });
        }

        return new DataFrame<IndexT, ValueT>(() => {    
            let importSeries: ISeries<IndexT, SeriesValueT>;
    
            if (Sugar.Object.isFunction(series as Object)) {
                importSeries = (series! as SeriesSelectorFn<IndexT, ValueT, SeriesValueT>)(this);
            }
            else { 
                importSeries = series! as ISeries<IndexT, SeriesValueT>;
            }

            const seriesValueMap = toMap(importSeries.toPairs(), pair => pair[0], pair => pair[1]);
            const newColumnNames =  makeDistinct(this.getColumnNames().concat([columnName]));
    
            return {
                columnNames: newColumnNames,
                index: this.getContent().index,
                pairs: new SelectIterable<[IndexT, ValueT], [IndexT, ValueT]>(this.getContent().pairs, pair => {
                    const index = pair[0];
                    const value = pair[1];
                    const modified: any = Object.assign({}, value);
                    modified[columnName] = seriesValueMap[index];
                    return [
                        index,
                        modified
                    ];
                }),
            };
        });
    }
    
    /**
     * Add a series to the dataframe, but only if it doesn't already exist.
     * 
     * @param columnNameOrSpec The name of the series to add or a {@link IColumnGenSpec} that specifies the columns to add.
     * @param [series] If columnNameOrSpec is a string that specifies the name of the series to add, this specifies the actual {@link Series} to add or a selector that generates the series given the dataframe.
     * 
     * @returns Returns a new dataframe with the specified series added, if the series didn't already exist. Otherwise if the requested series already exists the same dataframe is returned.
     * 
     * @example
     * <pre>
     * 
     * const updatedDf = df.ensureSeries("ANewColumn", new Series([1, 2, 3]));
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const updatedDf = df.ensureSeries("ANewColumn", df => 
     *      df.getSeries("AnExistingSeries").select(aTransformation)
     * );
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.ensureSeries({
     *      ANewColumn: new Series([1, 2, 3]),
     *      SomeOtherColumn: new Series([10, 20, 30])
     * });
     * <pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.ensureSeries({
     *      ANewColumn: df => df.getSeries("SourceData").select(aTransformation))
     * });
     * <pre>
     * */
    ensureSeries<SeriesValueT> (columnNameOrSpec: string | IColumnGenSpec, series?: ISeries<IndexT, SeriesValueT> | SeriesSelectorFn<IndexT, ValueT, SeriesValueT>): IDataFrame<IndexT, ValueT> {

        if (!Sugar.Object.isObject(columnNameOrSpec)) {
            assert.isString(columnNameOrSpec, "Expected 'columnNameOrSpec' parameter to 'DataFrame.ensureSeries' function to be a string that specifies the column to set or replace.");
            if (!Sugar.Object.isFunction(series as Object)) {
                assert.isObject(series, "Expected 'series' parameter to 'DataFrame.ensureSeries' to be a Series object or a function that takes a dataframe and produces a Series.");
            }
        }
        else {
            assert.isUndefined(series, "Expected 'series' parameter to 'DataFrame.ensureSeries' to not be set when 'columnNameOrSpec is an object.");
        }

        if (Sugar.Object.isObject(columnNameOrSpec)) {
            const columnSpec: IColumnGenSpec = <IColumnGenSpec> columnNameOrSpec;
            const columnNames = Object.keys(columnNameOrSpec);
            let workingDataFrame = <IDataFrame<IndexT,any>> this;
            for (const columnName of columnNames) {
                workingDataFrame = workingDataFrame.ensureSeries(columnName, columnSpec[columnName]);
            }

            return workingDataFrame;
        }

        const columnName: string = <string> columnNameOrSpec;
        if (this.hasSeries(columnName)) {
            return this; // Already have the series.
        }
        else {
            return this.withSeries(columnName, series);
        }
    }    

    /**
     * Create a new dataframe with just a subset of columns.
     *
     * @param columnNames Array of column names to include in the new dataframe.
     * 
     * @returns Returns a dataframe with a subset of columns from the original dataframe.
     * 
     * @example
     * <pre>
     * const subsetDf = df.subset(["ColumnA", "ColumnB"]);
     * </pre>
     */
    subset<NewValueT = ValueT> (columnNames: string[]): IDataFrame<IndexT, NewValueT> {
        assert.isArray(columnNames, "Expected 'columnNames' parameter to 'DataFrame.subset' to be an array of column names to keep.");	

        return new DataFrame<IndexT, NewValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: columnNames,
                index: content.index,
                values: new SelectIterable<ValueT, NewValueT>(content.values, (value: any) => {
                    const output: any = {};
                    for (const columnName of columnNames) {
                        output[columnName] = value[columnName];
                    }
                    return output;
                }),
                pairs: new SelectIterable<[IndexT, ValueT], [IndexT, NewValueT]>(content.pairs, (pair: any) => {
                    const output: any = {};
                    const value = pair[1];
                    for (const columnName of columnNames) {
                        output[columnName] = value[columnName];
                    }
                    return [pair[0], output];
                }),
            }
        });
    };
    
    /**
     * Create a new dataframe with the requested column or columns dropped.
     *
     * @param columnOrColumns Specifies the column name (a string) or columns (array of strings) to drop.
     * 
     * @returns Returns a new dataframe with a particular named column or columns removed.
     * 
     * @example
     * <pre>
     * const modifiedDf = df.dropSeries("SomeColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * const modifiedDf = df.dropSeries(["ColumnA", "ColumnB"]);
     * </pre>
     */
    dropSeries<NewValueT = ValueT> (columnOrColumns: string | string[]): IDataFrame<IndexT, NewValueT> {

        if (!Sugar.Object.isArray(columnOrColumns)) {
            assert.isString(columnOrColumns, "'DataFrame.dropSeries' expected either a string or an array or strings.");

            columnOrColumns = [columnOrColumns]; // Convert to array for coding convenience.
        }

        return new DataFrame<IndexT, NewValueT>(() => {
            const content = this.getContent();
            const newColumnNames = [];
            for (const columnName of content.columnNames) {
                if (columnOrColumns.indexOf(columnName) === -1) {
                    newColumnNames.push(columnName); // This column is not being dropped.
                }
            }

            return {
                columnNames: newColumnNames,
                index: content.index,
                values: new SelectIterable<ValueT, NewValueT>(content.values, value => {
                    const clone: any = Object.assign({}, value);
                    for (const droppedColumnName of columnOrColumns) {
                        delete clone[droppedColumnName];
                    }
                    return clone;
                }),
                pairs: new SelectIterable<[IndexT, ValueT], [IndexT, NewValueT]>(content.pairs, pair => {
                    const clone: any = Object.assign({}, pair[1]);
                    for (const droppedColumnName of columnOrColumns) {
                        delete clone[droppedColumnName];
                    }
                    return [pair[0], clone];
                }),
            };
        });
    }
        
    /**
     * Create a new dataframe with columns reordered.
     * New column names create new columns (with undefined values), omitting existing column names causes those columns to be dropped.
     * 
     * @param columnNames Specifies the new order for columns.
     * 
     * @returns Returns a new dataframe with columns reodered according to the order of the array of column names that is passed in.
     * 
     * @example
     * <pre>
     * const reorderedDf = df.reorderSeries(["FirstColumn", "SecondColumn", "etc"]);
     * </pre>
     */
    reorderSeries<NewValueT = ValueT> (columnNames: string[]): IDataFrame<IndexT, NewValueT> {

        assert.isArray(columnNames, "Expected parameter 'columnNames' to 'DataFrame.reorderSeries' to be an array with column names.");

        for (const columnName of columnNames) {
            assert.isString(columnName, "Expected parameter 'columnNames' to 'DataFrame.reorderSeries' to be an array with column names.");
        }

        return new DataFrame<IndexT, NewValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: columnNames,
                index: content.index,
                values: new SelectIterable<ValueT, NewValueT>(content.values, (value: any) => {
                    const output: any = {};
                    for (const columnName of columnNames) {
                        output[columnName] = value[columnName];
                    }

                    return <NewValueT> output;
                }),
                pairs:  new SelectIterable<[IndexT, ValueT], [IndexT, NewValueT]>(content.pairs, (pair: [IndexT, ValueT]) => {
                    const value: any = <any> pair[1];
                    const output: any = {};
                    for (const columnName of columnNames) {
                        output[columnName] = value[columnName];
                    }

                    return [pair[0], <NewValueT> output];
                }),
            };
        });
    }   

    /**
     * Bring the column(s) with specified name(s) to the front of the column order, making it (or them) the first column(s) in the output dataframe.
     *
     * @param columnOrColumns Specifies the column or columns to bring to the front.
     *
     * @returns Returns a new dataframe with 1 or more columns bought to the front of the column ordering.
     * 
     * @example
     * <pre>
     * const modifiedDf = df.bringToFront("NewFirstColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * const modifiedDf = df.bringToFront(["NewFirstColumn", "NewSecondColumn"]);
     * </pre>
     */
    bringToFront (columnOrColumns: string | string[]): IDataFrame<IndexT, ValueT> {

        if (Sugar.Object.isArray(columnOrColumns)) {
            columnOrColumns.forEach(function (columnName) {
                assert.isString(columnName, "Expect 'columnOrColumns' parameter to 'DataFrame.bringToFront' function to specify a column or columns via a string or an array of strings.");	
            });
        }
        else {
            assert.isString(columnOrColumns, "Expect 'columnOrColumns' parameter to 'DataFrame.bringToFront' function to specify a column or columns via a string or an array of strings.");

            columnOrColumns = [columnOrColumns]; // Convert to array for coding convenience.
        }

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const existingColumns = Array.from(content.columnNames);
            const columnsToMove: string[] = [];
            for (const columnToMove of columnOrColumns) {
                if (existingColumns.indexOf(columnToMove) !== -1) {
                    // The request column actually exists, so we will move it.
                    columnsToMove.push(columnToMove);
                }
            }

            const untouchedColumnNames: string[] = [];
            for (const existingColumnName of existingColumns) {
                if (columnOrColumns.indexOf(existingColumnName) === -1) {
                    untouchedColumnNames.push(existingColumnName);
                }
            }
            
            return {
                columnNames: columnsToMove.concat(untouchedColumnNames),
                index: content.index,
                values: content.values,
                pairs: content.pairs,
            };
        })
    }

    /**
     * Bring the column(s) with specified name(s) to the back of the column order, making it (or them) the last column(s) in the output dataframe.
     *
     * @param columnOrColumns Specifies the column or columns to bring to the back.
     *
     * @returns Returns a new dataframe with 1 or more columns bought to the back of the column ordering.
     * 
     * @example
     * <pre>
     * const modifiedDf = df.bringToBack("NewLastColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * const modifiedDf = df.bringToBack(["NewSecondLastCollumn, ""NewLastColumn"]);
     * </pre>
     */
    bringToBack (columnOrColumns: string | string[]): IDataFrame<IndexT, ValueT> {

        if (Sugar.Object.isArray(columnOrColumns)) {
            columnOrColumns.forEach(function (columnName) {
                assert.isString(columnName, "Expect 'columnOrColumns' parameter to 'DataFrame.bringToBack' function to specify a column or columns via a string or an array of strings.");	
            });
        }
        else {
            assert.isString(columnOrColumns, "Expect 'columnOrColumns' parameter to 'DataFrame.bringToBack' function to specify a column or columns via a string or an array of strings.");

            columnOrColumns = [columnOrColumns]; // Convert to array for coding convenience.
        }

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const existingColumns = Array.from(content.columnNames);
            const columnsToMove: string[] = [];
            for (const columnToMove of columnOrColumns) {
                if (existingColumns.indexOf(columnToMove) !== -1) {
                    // The request column actually exists, so we will move it.
                    columnsToMove.push(columnToMove);
                }
            }

            const untouchedColumnNames: string[] = [];
            for (const existingColumnName of existingColumns) {
                if (columnOrColumns.indexOf(existingColumnName) === -1) {
                    untouchedColumnNames.push(existingColumnName);
                }
            }
            
            return {
                columnNames: untouchedColumnNames.concat(columnsToMove),
                index: content.index,
                values: content.values,
                pairs: content.pairs,
            };
        })
    }
    
    /**
     * Create a new dataframe with 1 or more columns renamed.
     *
     * @param newColumnNames A column rename spec - a JavaScript hash that maps existing column names to new column names.
     * 
     * @returns Returns a new dataframe with specified columns renamed.
     * 
     * @example
     * <pre>
     * 
     * const renamedDf = df.renameSeries({ OldColumnName, NewColumnName });
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const renamedDf = df.renameSeries({ 
     *      Column1: ColumnA,
     *      Column2: ColumnB
     * });
     * </pre>
     */
    renameSeries<NewValueT = ValueT> (newColumnNames: IColumnRenameSpec): IDataFrame<IndexT, NewValueT> {

        assert.isObject(newColumnNames, "Expected parameter 'newColumnNames' to 'DataFrame.renameSeries' to be an array with column names.");

        const existingColumnsToRename = Object.keys(newColumnNames);
        for (const existingColumnName of existingColumnsToRename) {
            assert.isString(existingColumnName, "Expected existing column name '" + existingColumnName + "' of 'newColumnNames' parameter to 'DataFrame.renameSeries' to be a string.");
            assert.isString(newColumnNames[existingColumnName], "Expected new column name '" + newColumnNames[existingColumnName] + "' for existing column '" + existingColumnName + "' of 'newColumnNames' parameter to 'DataFrame.renameSeries' to be a string.");
        }

        return new DataFrame<IndexT, NewValueT>(() => {
            const content = this.getContent();
            const renamedColumns: string[] = [];

            for (const existingColumnName of content.columnNames) { // Convert the column rename spec to array of new column names.
                const columnIndex = existingColumnsToRename.indexOf(existingColumnName);
                if (columnIndex === -1) {
                    renamedColumns.push(existingColumnName); // This column is not renamed.                    
                }
                else {
                    renamedColumns.push(newColumnNames[existingColumnName]); // This column is renamed.
                }
            }
    
            //
            // Remap each row of the data frame to the new column names.
            //
            function remapValue (value: any): any {
                const clone = Object.assign({}, value);
    
                for (const existingColumName of existingColumnsToRename) {
                    clone[newColumnNames[existingColumName]] = clone[existingColumName];
                    delete clone[existingColumName];
                }
    
                return clone;
            }
    
            return {
                columnNames: renamedColumns,
                index: content.index,
                values: new SelectIterable<ValueT, NewValueT>(content.values, remapValue),
                pairs: new SelectIterable<[IndexT, ValueT], [IndexT, NewValueT]>(content.pairs, pair => {
                    return [pair[0], remapValue(pair[1])];
                }),
            };
        });
    };
    
    /**
    * Extract values from the dataframe as an array.
    * This forces lazy evaluation to complete.
    * 
    * @returns Returns an array of the values contained within the dataframe. 
    * 
    * @example
    * <pre>
    * const values = df.toArray();
    * </pre>
    */
    toArray (): any[] {
        const values = [];
        for (const value of this.getContent().values) {
            if (value !== undefined) {
                values.push(value);
            }
        }
        return values;
    }

    /**
     * Retreive the index and values pairs from the dataframe as an array.
     * Each pair is [index, value].
     * This forces lazy evaluation to complete.
     * 
     * @returns Returns an array of pairs that contains the dataframe content. Each pair is a two element array that contains an index and a value.  
     * 
     * @example
     * <pre>
     * const pairs = df.toPairs();
     * </pre>
     */
    toPairs (): ([IndexT, ValueT])[] {
        const pairs = [];
        for (const pair of this.getContent().pairs) {
            if (pair[1] != undefined) {
                pairs.push(pair);
            }
        }
        return pairs;
    }

    /**
     * Convert the dataframe to a JavaScript object.
     *
     * @param keySelector Function that selects keys for the resulting object.
     * @param valueSelector Function that selects values for the resulting object.
     * 
     * @returns Returns a JavaScript object generated from the dataframe by applying the key and value selector functions. 
     * 
     * @example
     * <pre>
     * 
     * const someObject = df.toObject(
     *      row => row.SomeColumn, // Specify the column to use for fields in the object.
     *      row => row.SomeOtherColumn // Specifi the column to use as the value for each field.
     * );
     * </pre>
     */
    toObject<KeyT = any, FieldT = any, OutT = any> (keySelector: (value: ValueT) => KeyT, valueSelector: (value: ValueT) => FieldT): OutT {

        assert.isFunction(keySelector, "Expected 'keySelector' parameter to DataFrame.toObject to be a function.");
        assert.isFunction(valueSelector, "Expected 'valueSelector' parameter to DataFrame.toObject to be a function.");

        return toMap(this, keySelector, valueSelector);
    }
    
    /**
     * Bake the data frame to an array of rows were each rows is an array of values in column order.
     * 
     * @returns Returns an array of rows. Each row is an array of values in column order.
     * 
     * @example
     * <pre>
     * const rows = df.toRows();
     * </pre>
     */
    toRows (): any[][] {
        const columnNames = this.getColumnNames();
        const rows = [];
        for (const value of this.getContent().values) {
            const row = [];
            for (let columnIndex = 0; columnIndex < columnNames.length; ++columnIndex) {
                row.push((<any>value)[columnNames[columnIndex]]);
            }

            rows.push(row);
        }
        
        return rows;
    }

    /**
     * Generates a new dataframe by repeatedly calling a selector function on each row in the original dataframe.
     *
     * @param selector Selector function that transforms each row to create the new dataframe.
     * 
     * @returns Returns a new dataframe that has been transformed by the selector function.
     * 
     * @example
     * <pre>
     * 
     * function transformRow (inputRow) {
     *      const outputRow = {
     *          // ... construct output row derived from input row ...
     *      };
     *
     *      return outputRow;
     * }
     *  
     * const modifiedDf = df.select(row => transformRow(row));
     * </pre>
     */
    select<ToT> (selector: SelectorWithIndexFn<ValueT, ToT>): IDataFrame<IndexT, ToT> {
        assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.select' function to be a function.");

        return new DataFrame(() => {
            const content = this.getContent();
            return {
                values: new SelectIterable<ValueT, ToT>(content.values, selector),
                index: content.index,    
            };
        });
    }

    /**
     * Generates a new dataframe by repeatedly calling a selector function on each row in the original dataframe.
     * 
     * In this case the selector function produces a collection of output rows that are flattened to create the new dataframe.
     *
     * @param selector Selector function that transforms each row into a collection of output rows.
     * 
     * @returns  Returns a new dataframe with rows that have been produced by the selector function. 
     * 
     * @example
     * <pre>
     * 
     * function produceOutputRows (inputRow) {
     *      const outputRows = [];
     *      while (someCondition) {     *      
     *          // ... generate zero or more output rows ...
     *          outputRows.push(... some generated row ...);
     *      }
     *      return outputRows;
     * }
     * 
     * const modifiedDf = df.selectMany(row => produceOutputRows(row));
     * </pre>
     */
    selectMany<ToT> (selector: SelectorWithIndexFn<ValueT, Iterable<ToT>>): IDataFrame<IndexT, ToT> {
        assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.selectMany' to be a function.");

        return new DataFrame(() => ({
            pairs: new SelectManyIterable(
                this.getContent().pairs, 
                (pair: [IndexT, ValueT], index: number): Iterable<[IndexT, ToT]> => {
                    const outputPairs: [IndexT, ToT][] = [];
                    for (const transformed of selector(pair[1], index)) {
                        outputPairs.push([
                            pair[0],
                            transformed
                        ]);
                    }
                    return outputPairs;
                }
            )
        }));
    }

    /**
     * Transform one or more columns. 
     * 
     * This is equivalent to extracting a {@link Series} with {@link getSeries}, then transforming it with {@link Series.select},
     * and finally plugging it back in as the same column using {@link withSeries}.
     *
     * @param columnSelectors Object with field names for each column to be transformed. Each field specifies a selector function that transforms that column.
     * 
     * @returns Returns a new dataframe with 1 or more columns transformed.
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.transformSeries({ 
     *      AColumnToTransform: columnValue => transformRow(columnValue) 
     * });
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const modifiedDf = df.transformSeries({ 
     *      ColumnA: columnValue => transformColumnA(columnValue),
     *      ColumnB: columnValue => transformColumnB(columnValue)
     * });
     * </pre>
     */
    transformSeries<NewValueT = ValueT> (columnSelectors: IColumnTransformSpec): IDataFrame<IndexT, NewValueT> {

        assert.isObject(columnSelectors, "Expected 'columnSelectors' parameter of 'DataFrame.transformSeries' function to be an object. Field names should specify columns to transform. Field values should be selector functions that specify the transformation for each column.");

        let working: IDataFrame<IndexT, any> = this;

        for (const columnName of Object.keys(columnSelectors)) {
            if (working.hasSeries(columnName)) {
                working = working.withSeries(
                    columnName, 
                    working.getSeries(columnName)
                        .select(columnSelectors[columnName])
                );
            }
        }

        return working;
    }

    /** 
     * Generate new columns based on existing rows.
     * 
     * This is equivalent to calling {@link select} to transform the original dataframe to a new dataframe with different column,
     * then using {@link withSeries} to merge each the of both the new and original dataframes.
     *
     * @param generator Generator function that transforms each row to produce 1 or more new columns.
     * Or use a column spec that has fields for each column, the fields specify a generate function that produces the value for each new column.
     * 
     * @returns Returns a new dataframe with 1 or more new columns.
     * 
     * @example
     * <pre>
     * 
     * function produceNewColumns (inputRow) {
     *      const newColumns = {
     *          // ... specify new columns and their values based on the input row ...
     *      };
     * 
     *      return newColumns;
     * };
     * 
     * const dfWithNewSeries = df.generateSeries(row => produceNewColumns(row));
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const dfWithNewSeries = df.generateSeries({ 
     *      NewColumnA: row => produceNewColumnA(row),
     *      NewColumnB: row => produceNewColumnB(row),
     * })
     * </pre>
     */
    generateSeries<NewValueT = ValueT> (generator: SelectorWithIndexFn<any, any> | IColumnTransformSpec): IDataFrame<IndexT, NewValueT> {

        if (!Sugar.Object.isObject(generator)) {
            assert.isFunction(generator, "Expected 'generator' parameter to 'DataFrame.generateSeries' function to be a function or an object.");

            const selector = generator as SelectorWithIndexFn<any, any>;
            const newColumns = this.select(selector) // Build a new dataframe.
                .bake(); //TODO: Bake should be needed here, but it causes problems if not.
            const newColumnNames = newColumns.getColumnNames(); 

            let working: IDataFrame<IndexT, any> = this;
 
            //TODO: There must be a cheaper implementation!
            for (const newColumnName of newColumnNames) {
                working = working.withSeries(newColumnName, newColumns.getSeries(newColumnName));
            }

            return working;
        }
        else {
            const columnTransformSpec = generator as IColumnTransformSpec;
            const newColumnNames = Object.keys(columnTransformSpec);
            
            let working: IDataFrame<IndexT, any> = this;

            for (const newColumnName of newColumnNames) {
                working = working.withSeries(newColumnName, working.select(columnTransformSpec[newColumnName]).deflate());
            }

            return working;
        }
    }    

    /** 
     * Converts (deflates) a dataframe to a {@link Series}.
     *
     * @param [selector] Optional selector function that transforms each row to produce the series.
     *
     * @returns Returns a series that was created from the deflated from  the original dataframe.
     * 
     * @example
     * <pre>
     * 
     * const series = df.deflate(); // Deflate to a series of object.
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const series = df.deflate(row => row.SomeColumn); // Extract a particular column.
     * </pre>
     */
    deflate<ToT = ValueT> (selector?: SelectorWithIndexFn<ValueT, ToT>): ISeries<IndexT, ToT> {

        if (selector) {
            assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.deflate' function to be a selector function.");
        }

        return new Series<IndexT, ToT>(() => { 
            const content = this.getContent();
            if (selector) {
                return {
                    index: content.index,
                    values: new SelectIterable<ValueT, ToT>(content.values, selector),
                    pairs: new SelectIterable<[IndexT, ValueT], [IndexT, ToT]>(content.pairs, (pair, index) => {
                        return [
                            pair[0],
                            selector(pair[1], index)
                        ];
                    }),    
                };
            }
            else {
                return {
                    index: content.index,
                    values: content.values as any as Iterable<ToT>,
                    pairs: content.pairs as any as Iterable<[IndexT, ToT]>,
                };
            }
        });
    };

    /** 
     * Inflate a named {@link Series} in the dataframe to 1 or more new series in the new dataframe.
     * 
     * This is the equivalent of extracting the series using {@link getSeries}, transforming them with {@link Series.select}
     * and then running {@link Series.inflate} to create a new dataframe, then merging each column of the new dataframe
     *  into the original dataframe using {@link withSeries}.
     *
     * @param columnName Name of the series to inflate.
     * @param [selector] Optional selector function that transforms each value in the column to new columns. If not specified it is expected that each value in the column is an object whose fields define the new column names.
     * 
     * @returns Returns a new dataframe with a column inflated to 1 or more new columns.
     * 
     * @example
     * <pre>
     * 
     * function newColumnGenerator (row) {
     *      const newColumns = {
     *          // ... create 1 field per new column ...
     *      };
     * 
     *      return row;
     * }
     * 
     * const dfWithNewSeries = df.inflateSeries("SomeColumn", newColumnGenerator);
     * </pre>
     */
    inflateSeries<NewValueT = ValueT> (columnName: string, selector?: SelectorWithIndexFn<IndexT, any>): IDataFrame<IndexT, ValueT> {

        assert.isString(columnName, "Expected 'columnName' parameter to 'DataFrame.inflateSeries' to be a string that is the name of the column to inflate.");

        if (selector) {
            assert.isFunction(selector, "Expected optional 'selector' parameter to 'DataFrame.inflateSeries' to be a selector function, if it is specified.");
        }

        return this.zip(
            this.getSeries(columnName).inflate(selector),
            (row1, row2) => Object.assign({}, row1, row2) //todo: this be should zip's default operation.
        );
    }

    /**
     * Partition a dataframe into a {@link Series} of *data windows*. 
     * Each value in the new series is a rolling chunk of data from the original dataframe.
     *
     * @param period The number of data rows to include in each data window.
     * 
     * @returns Returns a new series, each value of which is a chunk of the original dataframe.
     * 
     * @example
     * <pre>
     * 
     * const windows = df.window(2); // Get values in pairs.
     * const pctIncrease = windows.select(pair => (pair.last() - pair.first()) / pair.first());
     * console.log(pctIncrease.toString());
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const salesDf = ... // Daily sales data.
     * const weeklySales = salesDf.window(7); // Partition up into weekly data sets.
     * console.log(weeklySales.toString());
     * </pre>
     */
    window (period: number): ISeries<number, IDataFrame<IndexT, ValueT>> {

        assert.isNumber(period, "Expected 'period' parameter to 'DataFrame.window' to be a number.");

        return new Series<number, IDataFrame<IndexT, ValueT>>(() => {
            const content = this.getContent();
            return {
                values: new DataFrameWindowIterable<IndexT, ValueT>(content.columnNames, content.pairs, period)
            };            
        });
    }

    /** 
     * Partition a dataframe into a {@link Series} of *rolling data windows*. 
     * Each value in the new series is a rolling chunk of data from the original dataframe.
     *
     * @param period The number of data rows to include in each data window.
     * 
     * @returns Returns a new series, each value of which is a rolling chunk of the original dataframe.
     * 
     * @example
     * <pre>
     * 
     * const salesDf = ... // Daily sales data.
     * const rollingWeeklySales = salesDf.rollingWindow(7); // Get rolling window over weekly sales data.
     * console.log(rollingWeeklySales.toString());
     * </pre>
     */
    rollingWindow (period: number): ISeries<number, IDataFrame<IndexT, ValueT>> {

        assert.isNumber(period, "Expected 'period' parameter to 'DataFrame.rollingWindow' to be a number.");

        return new Series<number, IDataFrame<IndexT, ValueT>>(() => {
            const content = this.getContent();
            return {
                values: new DataFrameRollingWindowIterable<IndexT, ValueT>(content.columnNames, content.pairs, period)
            };            
        });
    }

    /**
     * Partition a dataframe into a {@link Series} of variable-length *data windows* 
     * where the divisions between the data chunks are
     * defined by a user-provided *comparer* function.
     * 
     * @param comparer Function that compares two adjacent data rows and returns true if they should be in the same window.
     * 
     * @returns Returns a new series, each value of which is a chunk of data from the original dataframe.
     * 
     * @example
     * <pre>
     * 
     * function rowComparer (rowA, rowB) {
     *      if (... rowA should be in the same data window as rowB ...) {
     *          return true;
     *      }
     *      else {
     *          return false;
     *      }
     * };
     * 
     * const variableWindows = df.variableWindow(rowComparer);
     */
    variableWindow (comparer: ComparerFn<ValueT, ValueT>): ISeries<number, IDataFrame<IndexT, ValueT>> {
        
        assert.isFunction(comparer, "Expected 'comparer' parameter to 'DataFrame.variableWindow' to be a function.")

        return new Series<number, IDataFrame<IndexT, ValueT>>(() => {
            const content = this.getContent();
            return {
                values: new DataFrameVariableWindowIterable<IndexT, ValueT>(content.columnNames, content.pairs, comparer)
            };            
        });
    }

    /**
     * Eliminates adjacent duplicate rows.
     * 
     * For each group of adjacent values that are equivalent only returns the last index/row for the group, 
     * thus ajacent equivalent rows are collapsed down to the last row.
     *
     * @param [selector] Optional selector function to determine the value used to compare for equivalence.
     * 
     * @returns Returns a new dataframe with groups of adjacent duplicate rows collapsed to a single row per group.
     * 
     * @example
     * <pre>
     * 
     * const dfWithDuplicateRowsRemoved = df.sequentialDistinct(row => row.ColumnA);
     * </pre>
     */
    sequentialDistinct<ToT = ValueT> (selector?: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ValueT> {
        
        if (selector) {
            assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.sequentialDistinct' to be a selector function that determines the value to compare for duplicates.")
        }
        else {
            selector = (value: ValueT): ToT => <ToT> <any> value;
        }

        return this.variableWindow((a, b) => selector!(a) === selector!(b))
            .select((window): [IndexT, ValueT] => {
                return [window.getIndex().first(), window.first()];
            })
            .withIndex(pair => pair[0])
            .inflate(pair => pair[1]); //TODO: Should this be select?
    }

    /**
     * Aggregate the rows in the dataframe to a single result.
     *
     * @param [seed] Optional seed value for producing the aggregation.
     * @param selector Function that takes the seed and then each row in the dataframe and produces the aggregate value.
     * 
     * @returns Returns a new value that has been aggregated from the dataframe using the 'selector' function. 
     * 
     * @example
     * <pre>
     * 
     * const dailySalesDf = ... daily sales figures for the past month ...
     * const totalSalesForthisMonth = dailySalesDf.aggregate(
     *      0, // Seed - the starting value.
     *      (accumulator, row) => accumulator + row.SalesAmount // Aggregation function.
     * );
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const totalSalesAllTime = 500; // We'll seed the aggregation with this value.
     * const dailySalesDf = ... daily sales figures for the past month ...
     * const updatedTotalSalesAllTime = dailySalesDf.aggregate(
     *      totalSalesAllTime, 
     *      (accumulator, row) => accumulator + row.SalesAmount
     * );
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * var salesDataSummary = salesDataDf.aggregate({
     *      TotalSales: df => df.count(),
     *      AveragePrice: df => df.deflate(row => row.Price).average(),
     *      TotalRevenue: df => df.deflate(row => row.Revenue).sum(), 
     * });
     * </pre>
    */
    aggregate<ToT = ValueT> (seedOrSelector: AggregateFn<ValueT, ToT> | ToT | IColumnAggregateSpec, selector?: AggregateFn<ValueT, ToT>): ToT {

        if (Sugar.Object.isFunction(seedOrSelector) && !selector) {
            return this.skip(1).aggregate(<ToT> <any> this.first(), seedOrSelector);
        }
        else if (selector) {
            assert.isFunction(selector, "Expected 'selector' parameter to aggregate to be a function.");

            let accum = <ToT> seedOrSelector;

            for (const value of this) {
                accum = selector!(accum, value);                
            }

            return accum;
        }
        else {
            assert.isObject(seedOrSelector, "Expected 'seed' parameter to aggregate to be an object.");

            const columnAggregateSpec = seedOrSelector as IColumnAggregateSpec;
            const columnNames = Object.keys(columnAggregateSpec);
            const aggregatedColumns = columnNames.map(columnName => {
                var columnSelector = columnAggregateSpec[columnName];
                assert.isFunction(columnSelector, "Expected column/selector pairs in 'seed' parameter to aggregate.");
                return [columnName, this.getSeries(columnName).aggregate(columnSelector)];
            });

            return toMap(aggregatedColumns, pair => pair[0], pair => pair[1]);
        }
    }
    
    /**
     * Skip a number of rows in the dataframe.
     *
     * @param numValues Number of rows to skip.
     * 
     * @returns Returns a new dataframe with the specified number of rows skipped. 
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsSkipped = df.skip(10); // Skip 10 rows in the original dataframe.
     * </pre>
     */
    skip (numValues: number): IDataFrame<IndexT, ValueT> {
        assert.isNumber(numValues, "Expected 'numValues' parameter to 'DataFrame.skip' to be a number.");

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new SkipIterable(content.values, numValues),
                index: new SkipIterable(content.index, numValues),
                pairs: new SkipIterable(content.pairs, numValues),
            };
        });
    }

    /**
     * Skips values in the dataframe while a condition evaluates to true or truthy.
     *
     * @param predicate Returns true/truthy to continue to skip rows in the original dataframe.
     * 
     * @returns Returns a new dataframe with all initial sequential rows removed while the predicate returned true/truthy.
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsSkipped = df.skipWhile(row => row.CustomerName === "Fred"); // Skip initial customers named Fred.
     * </pre>
     */
    skipWhile (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.skipWhile' function to be a predicate function that returns true/false.");

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new SkipWhileIterable(content.values, predicate),
                pairs: new SkipWhileIterable(content.pairs, pair => predicate(pair[1])),
            };
        });
    }

    /**
     * Skips values in the dataframe untils a condition evaluates to true or truthy.
     *
     * @param predicate Return true/truthy to stop skipping rows in the original dataframe.
     * 
     * @returns Returns a new dataframe with all initial sequential rows removed until the predicate returned true/truthy.
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsSkipped = df.skipUntil(row => row.CustomerName === "Fred"); // Skip initial customers until we find Fred.
     * </pre>
     */
    skipUntil (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.skipUntil' function to be a predicate function that returns true/false.");

        return this.skipWhile(value => !predicate(value)); 
    }

    /**
     * Take a number of rows in the dataframe.
     *
     * @param numValues Number of rows to take.
     * 
     * @returns Returns a new dataframe with only the specified number of rows taken from the original dataframe.
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsTaken = df.take(15); // Take only the first 15 rows from the original dataframe.
     * </pre>
     */
    take (numRows: number): IDataFrame<IndexT, ValueT> {
        assert.isNumber(numRows, "Expected 'numRows' parameter to 'DataFrame.take' function to be a number.");

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                index: new TakeIterable(content.index, numRows),
                values: new TakeIterable(content.values, numRows),
                pairs: new TakeIterable(content.pairs, numRows)
            };
        });
    };

    /**
     * Takes values from the dataframe while a condition evaluates to true or truthy.
     *
     * @param predicate Returns true/truthy to continue to take rows from the original dataframe.
     * 
     * @returns Returns a new dataframe with only the initial sequential rows that were taken while the predicate returned true/truthy.
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsTaken = df.takeWhile(row => row.CustomerName === "Fred"); // Take only initial customers named Fred.
     * </pre>
     */
    takeWhile (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.takeWhile' function to be a predicate function that returns true/false.");

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new TakeWhileIterable(content.values, predicate),
                pairs: new TakeWhileIterable(content.pairs, pair => predicate(pair[1]))
            };
        });
    }

    /**
     * Takes values from the dataframe untils a condition evaluates to true or truthy.
     *
     * @param predicate Return true/truthy to stop taking rows in the original dataframe.
     * 
     * @returns Returns a new dataframe with only the initial sequential rows taken until the predicate returned true/truthy.
     * 
     * @example
     * <pre>
     * 
     * const dfWithRowsTaken = df.takeUntil(row => row.CustomerName === "Fred"); // Take all initial customers until we find Fred.
     * </pre>
     */
    takeUntil (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.takeUntil' function to be a predicate function that returns true/false.");

        return this.takeWhile(value => !predicate(value));
    }

    /**
     * Count the number of rows in the dataframe
     *
     * @returns Returns the count of all rows.
     * 
     * @example
     * <pre>
     * 
     * const numRows = df.count();
     * </pre>
     */
    count (): number {

        let total = 0;
        for (const value of this.getContent().values) {
            ++total;
        }
        return total;
    }

    /**
     * Get the first row of the dataframe.
     *
     * @returns Returns the first row of the dataframe.
     * 
     * @example
     * <pre>
     * 
     * const firstRow = df.first();
     * </pre>
     */
    first (): ValueT {

        for (const value of this) {
            return value; // Only need the first value.
        }

        throw new Error("No values in Series.");
    }

    /**
     * Get the last row of the dataframe.
     *
     * @returns Returns the last row of the dataframe.
     * 
     * @example
     * <pre>
     * 
     * const lastRow = df.last();
     * </pre>
     */
    last (): ValueT {

        let lastValue = null;

        for (const value of this) {
            lastValue = value; // Throw away all values until we get to the last one.
        }

        if (lastValue === null) {
            throw new Error("No values in Series.");
        }

        return lastValue;
    }    
    
    /**
     * Get the row, if there is one, with the specified index.
     *
     * @param index Index to for which to retreive the row.
     *
     * @returns Returns the row from the specified index in the dataframe or undefined if there is no such index in the present in the dataframe.
     * 
     * @example
     * <pre>
     * 
     * const row = df.at(5); // Get the row at index 5 (with a default 0-based index).
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const date = ... some date ...
     * // Retreive the row with specified date from a time-series dataframe (assuming date indexed has been applied).
     * const row = df.at(date); 
     * </pre>
     */
    at (index: IndexT): ValueT | undefined {

        if (this.none()) {
            return undefined;
        }

        //
        // This is pretty expensive.
        // A specialised index could improve this.
        //

        for (const pair of this.getContent().pairs) {
            if (pair[0] === index) {
                return pair[1];
            }
        }

        return undefined;
    }
    
    /** 
     * Get X rows from the start of the dataframe.
     * Pass in a negative value to get all rows at the head except for X rows at the tail.
     *
     * @param numValues Number of rows to take.
     * 
     * @returns Returns a new dataframe that has only the specified number of rows taken from the start of the original dataframe.  
     * 
     * @examples
     * <pre>
     * 
     * const sample = df.head(10); // Take a sample of 10 rows from the start of the dataframe.
     * </pre>
     */
    head (numValues: number): IDataFrame<IndexT, ValueT> {

        assert.isNumber(numValues, "Expected 'numValues' parameter to 'DataFrame.head' function to be a number.");

        if (numValues === 0) {
            return new DataFrame<IndexT, ValueT>(); // Empty dataframe.
        }

        const toTake = numValues < 0 ? this.count() - Math.abs(numValues) : numValues;
        return this.take(toTake);
    }

    /** 
     * Get X rows from the end of the dataframe.
     * Pass in a negative value to get all rows at the tail except X rows at the head.
     *
     * @param numValues Number of rows to take.
     * 
     * @returns Returns a new dataframe that has only the specified number of rows taken from the end of the original dataframe.  
     * 
     * @examples
     * <pre>
     * 
     * const sample = df.tail(12); // Take a sample of 12 rows from the end of the dataframe.
     * </pre>
     */
    tail (numValues: number): IDataFrame<IndexT, ValueT> {

        assert.isNumber(numValues, "Expected 'numValues' parameter to 'DataFrame.tail' function to be a number.");

        if (numValues === 0) {
            return new DataFrame<IndexT, ValueT>(); // Empty dataframe.
        }

        const toSkip = numValues > 0 ? this.count() - numValues : Math.abs(numValues);
        return this.skip(toSkip);
    }

    /**
     * Filter the dataframe using user-defined predicate function.
     *
     * @param predicate Predicte function to filter rows from the dataframe. Returns true/truthy to keep rows, or false/falsy to omit rows.
     * 
     * @returns Returns a new dataframe containing only the rows from the original dataframe that matched the predicate. 
     * 
     * @example
     * <pre>
     * 
     * const filteredDf = df.where(row => row.CustomerName === "Fred"); // Filter so we only have customers named Fred.
     * </pre>
     */
    where (predicate: PredicateFn<ValueT>): IDataFrame<IndexT, ValueT> {

        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.where' function to be a function.");

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new WhereIterable(content.values, predicate),
                pairs: new WhereIterable(content.pairs, pair => predicate(pair[1]))
            };
        });
    }

    /**
     * Invoke a callback function for each roew in the dataframe.
     *
     * @param callback The calback function to invoke for each row.
     * 
     * @returns Returns the original dataframe with no modifications.
     * 
     * @example
     * <pre>
     * 
     * df.forEach(row => {
     *      // ... do something with the row ...
     * });
     * </pre>
     */
    forEach (callback: CallbackFn<ValueT>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(callback, "Expected 'callback' parameter to 'DataFrame.forEach' to be a function.");

        let index = 0;
        for (const value of this) {
            callback(value, index++);
        }

        return this;
    }

    /**
     * Evaluates a predicate function for every row in the dataframe to determine 
     * if some condition is true/truthy for **all** rows in the dataframe.
     * 
     * @param predicate Predicate function that receives each row. It should returns true/truthy for a match, otherwise false/falsy.
     *
     * @returns Returns true if the predicate has returned true or truthy for every row in the dataframe, otherwise returns false. Returns false for an empty dataframe. 
     * 
     * @example
     * <pre>
     * 
     * const everyoneIsNamedFred = df.all(row => row.CustomerName === "Fred"); // Check if all customers are named Fred.
     * </pre>
     */
    all (predicate: PredicateFn<ValueT>): boolean {
        assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.all' to be a function.")

        let count = 0;

        for (const value of this) {
            if (!predicate(value)) {
                return false;
            }

            ++count;
        }

        return count > 0;
    }

    /**
     * Evaluates a predicate function for every row in the dataframe to determine 
     * if some condition is true/truthy for **any** of rows in the dataframe.
     * 
     * If no predicate is specified then it simply checks if the dataframe contains more than zero rows.
     *
     * @param [predicate] Optional predicate function that receives each row. It should return true/truthy for a match, otherwise false/falsy.
     *
     * @returns Returns true if the predicate has returned truthy for any row in the sequence, otherwise returns false. 
     * If no predicate is passed it returns true if the dataframe contains any rows at all. 
     * Returns false for an empty dataframe.
     * 
     * @example
     * <pre>
     * 
     * const anyFreds = df.any(row => row.CustomerName === "Fred"); // Do we have any customers named Fred?
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const anyCustomers = df.any(); // Do we have any customers at all?
     * </pre>
     */
    any (predicate?: PredicateFn<ValueT>): boolean {
        if (predicate) {
            assert.isFunction(predicate, "Expected optional 'predicate' parameter to 'DataFrame.any' to be a function.")
        }

        if (predicate) {
            // Use the predicate to check each value.
            for (const value of this) {
                if (predicate(value)) {
                    return true;
                }
            }
        }
        else {
            // Just check if there is at least one item.
            const iterator = this[Symbol.iterator]()
            return !iterator.next().done;
        }

        return false; // Nothing passed.
    }

    /**
     * Evaluates a predicate function for every row in the dataframe to determine 
     * if some condition is true/truthy for **none** of rows in the dataframe.
     * 
     * If no predicate is specified then it simply checks if the dataframe contains zero rows.
     *
     * @param [predicate] Optional predicate function that receives each row. It should return true/truthy for a match, otherwise false/falsy.
     *
     * @returns Returns true if the predicate has returned truthy for zero rows in the dataframe, otherwise returns false. Returns false for an empty dataframe.
     * 
     * @example
     * <pre>
     * 
     * const noFreds = df.none(row => row.CustomerName === "Fred"); // Do we have zero customers named Fred?
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const noCustomers = df.none(); // Do we have zero customers?
     * </pre>
     */
    none (predicate?: PredicateFn<ValueT>): boolean {

        if (predicate) {
            assert.isFunction(predicate, "Expected 'predicate' parameter to 'DataFrame.none' to be a function.")
        }

        if (predicate) {
            // Use the predicate to check each value.
            for (const value of this) {
                if (predicate(value)) {
                    return false;
                }
            }
        }
        else {
            // Just check if empty.
            const iterator = this[Symbol.iterator]()
            return iterator.next().done;
        }

        return true; // Nothing failed the predicate.
    }

    /**
     * Gets a new dataframe containing all rows starting at and after the specified index value.
     * 
     * @param indexValue The index value at which to start the new dataframe.
     * 
     * @returns Returns a new dataframe containing all rows starting at and after the specified index value. 
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ 
     *      index: [0, 1, 2, 3], // This is the default index.
     *      values: [10, 20, 30, 40],
     * });
     * 
     * const lastHalf = df.startAt(2);
     * expect(lastHalf.toArray()).to.eql([30, 40]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const timeSeriesDf = ... a dataframe indexed by date/time ...
     * 
     * // Get all rows starting at (or after) a particular date.
     * const allRowsFromStartDate = df.startAt(new Date(2016, 5, 4)); 
     * </pre>
     */
    startAt (indexValue: IndexT): IDataFrame<IndexT, ValueT> {

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const lessThan = this.getIndex().getLessThan();
            return {                
                columnNames: content.columnNames,
                index: new SkipWhileIterable(content.index, index => lessThan(index, indexValue)),
                pairs: new SkipWhileIterable(content.pairs, pair => lessThan(pair[0], indexValue)),
            };
        });
    }

    /**
     * Gets a new dataframe containing all rows up until and including the specified index value (inclusive).
     * 
     * @param indexValue The index value at which to end the new dataframe.
     * 
     * @returns Returns a new dataframe containing all rows up until and including the specified index value.
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ 
     *      index: [0, 1, 2, 3], // This is the default index.
     *      values: [10, 20, 30, 40],
     * });
     * 
     * const firstHalf = df.endAt(1);
     * expect(firstHalf.toArray()).to.eql([10, 20]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const timeSeriesDf = ... a dataframe indexed by date/time ...
     * 
     * // Get all rows ending at a particular date.
     * const allRowsUpToAndIncludingTheExactEndDate = df.endAt(new Date(2016, 5, 4)); 
     * </pre>
     */
    endAt (indexValue: IndexT): IDataFrame<IndexT, ValueT> {

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const lessThanOrEqualTo = this.getIndex().getLessThanOrEqualTo();
            return {
                columnNames: content.columnNames,
                index: new TakeWhileIterable(content.index, index => lessThanOrEqualTo(index, indexValue)),
                pairs: new TakeWhileIterable(content.pairs, pair => lessThanOrEqualTo(pair[0], indexValue)),
            };
        });
    }

    /**
     * Gets a new dataframe containing all rows up to the specified index value (exclusive).
     * 
     * @param indexValue The index value at which to end the new dataframe.
     * 
     * @returns Returns a new dataframe containing all rows up to (but not including) the specified index value. 
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ 
     *      index: [0, 1, 2, 3], // This is the default index.
     *      values: [10, 20, 30, 40],
     * });
     * 
     * const firstHalf = df.before(2);
     * expect(firstHalf.toArray()).to.eql([10, 20]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const timeSeriesDf = ... a dataframe indexed by date/time ...
     * 
     * // Get all rows before the specified date.
     * const allRowsBeforeEndDate = df.before(new Date(2016, 5, 4)); 
     * </pre>
     */
    before (indexValue: IndexT): IDataFrame<IndexT, ValueT> {

        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const lessThan = this.getIndex().getLessThan();
            return {
                columnNames: content.columnNames,
                index: new TakeWhileIterable(content.index, index => lessThan(index, indexValue)),
                pairs: new TakeWhileIterable(content.pairs, pair => lessThan(pair[0], indexValue)),
            };
        });
    }

    /**
     * Gets a new dataframe containing all rows after the specified index value (exclusive).
     * 
     * @param indexValue The index value after which to start the new dataframe.
     * 
     * @returns Returns a new dataframe containing all rows after the specified index value.
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ 
     *      index: [0, 1, 2, 3], // This is the default index.
     *      values: [10, 20, 30, 40],
     * });
     * 
     * const lastHalf = df.before(1);
     * expect(lastHalf.toArray()).to.eql([30, 40]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const timeSeriesDf = ... a dataframe indexed by date/time ...
     * 
     * // Get all rows after the specified date.
     * const allRowsAfterStartDate = df.after(new Date(2016, 5, 4)); 
     * </pre>
     */
    after (indexValue: IndexT): IDataFrame<IndexT, ValueT> {
        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            const lessThanOrEqualTo = this.getIndex().getLessThanOrEqualTo();
            return {
                columnNames: content.columnNames,
                index: new SkipWhileIterable(content.index, index => lessThanOrEqualTo(index, indexValue)),
                pairs: new SkipWhileIterable(content.pairs, pair => lessThanOrEqualTo(pair[0], indexValue)),
            };
        });
    }

    /**
     * Gets a new dataframe containing all rows between the specified index values (inclusive).
     * 
     * @param startIndexValue The index at which to start the new dataframe.
     * @param endIndexValue The index at which to end the new dataframe.
     * 
     * @returns Returns a new dataframe containing all values between the specified index values (inclusive).
     * 
     * @example
     * <pre>
     * 
     * const df = new DataFrame({ 
     *      index: [0, 1, 2, 3, 4, 6], // This is the default index.
     *      values: [10, 20, 30, 40, 50, 60],
     * });
     * 
     * const middleSection = df.between(1, 4);
     * expect(middleSection.toArray()).to.eql([20, 30, 40, 50]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const timeSeriesDf = ... a dataframe indexed by date/time ...
     * 
     * // Get all rows between the start and end dates (inclusive).
     * const allRowsBetweenDates = df.after(new Date(2016, 5, 4), new Date(2016, 5, 22)); 
     * </pre>
     */
    between (startIndexValue: IndexT, endIndexValue: IndexT): IDataFrame<IndexT, ValueT> {
        return this.startAt(startIndexValue).endAt(endIndexValue); 
    }

    /** 
     * Format the dataframe for display as a string.
     * This forces lazy evaluation to complete.
     * 
     * @returns Generates and returns a string representation of the dataframe or dataframe.
     * 
     * @example
     * <pre>
     * 
     * console.log(df.toString());
     * </pre>
     */
    toString (): string {

        const columnNames = this.getColumnNames();
        const header = ["__index__"].concat(columnNames);

        const table = new Table();
        //TODO: for (const pair of this.asPairs()) {
        for (const pair of this.toPairs()) {
            const index = pair[0];
            const value = pair[1] as any;
            table.cell(header[0], index);
            columnNames.forEach((columnName, columnIndex) => {
                table.cell(header[columnIndex+1], value[columnName]);
            });
            table.newRow();
        }

        return table.toString();
    }

    /**
     * Parse a column with string values and convert it to a column with int values.
     *
     * @param columnNameOrNames Specifies the column name or array of column names to parse.
     * 
     * @returns Returns a new dataframe with a particular named column parsed as ints.  
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumn = df.parseInts("MyIntColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumns = df.parseInts(["MyIntColumnA", "MyIntColumnA"]);
     * </pre>
     */
    parseInts (columnNameOrNames: string | string[]): IDataFrame<IndexT, ValueT> {

        if (Sugar.Object.isArray(columnNameOrNames)) {
            let working: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNameOrNames) {
                working = working.parseInts(columnName);
            }
            
            return working;
        }
        else {
            return this.withSeries(columnNameOrNames, this.getSeries(columnNameOrNames).parseInts());
        }
    }

    /**
     * Parse a column with string values and convert it to a column with float values.
     *
     * @param columnNameOrNames Specifies the column name or array of column names to parse.
     * 
     * @returns  Returns a new dataframe with a particular named column parsed as floats.  
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumn = df.parseFloats("MyFloatColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumns = df.parseFloats(["MyFloatColumnA", "MyFloatColumnA"]);
     * </pre>
     */
    parseFloats (columnNameOrNames: string | string[]): IDataFrame<IndexT, ValueT> {

        if (Sugar.Object.isArray(columnNameOrNames)) {
            let working: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNameOrNames) {
                working = working.parseFloats(columnName);
            }
            
            return working;
        }
        else {
            return this.withSeries(columnNameOrNames, this.getSeries(columnNameOrNames).parseFloats());
        }
    }

    /**
     * Parse a column with string values and convert it to a column with date values.
     *
     * @param columnNameOrNames -Specifies the column name or array of column names to parse.
     * @param [formatString] Optional formatting string for dates.
     * 
     * @returns Returns a new dataframe with a particular named column parsed as dates.
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumn = df.parseDates("MyDateColumn");
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const withParsedColumns = df.parseDates(["MyDateColumnA", "MyDateColumnA"]);
     * </pre>
     */
    parseDates (columnNameOrNames: string | string[], formatString?: string): IDataFrame<IndexT, ValueT> {

        if (formatString) {
            assert.isString(formatString, "Expected optional 'formatString' parameter to 'DataFrame.parseDates' to be a string (if specified).");
        }

        if (Sugar.Object.isArray(columnNameOrNames)) {
            let working: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNameOrNames) {
                working = working.parseDates(columnName, formatString);
            }
            
            return working;
        }
        else {
            return this.withSeries(columnNameOrNames, this.getSeries(columnNameOrNames).parseDates(formatString));
        }
    }

    /**
     * Convert a column of values of different types to a column of string values.
     *
     * @param columnNames Specifies the column name or array of column names to convert to strings. Can also be a format spec that specifies which columns to convert and what their format should be. 
     * @param [formatString] Optional formatting string for dates.
     * 
     * Numeral.js is used for number formatting.
     * http://numeraljs.com/
     * 
     * Moment is used for date formatting.
     * https://momentjs.com/docs/#/parsing/string-format/
     * 
     * @returns Returns a new dataframe with a particular named column convert to strings.
     * 
     * @example
     * <pre>
     * 
     * const withStringColumn = df.toStrings("MyDateColumn", "YYYY-MM-DD");
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const withStringColumn = df.toStrings("MyFloatColumn", "0.00");
     * </pre>
     */
    toStrings (columnNames: string | string[] | IFormatSpec, formatString?: string): IDataFrame<IndexT, ValueT> {

        if (Sugar.Object.isObject(columnNames)) {
            for (const columnName of Object.keys(columnNames)) {
                assert.isString((columnNames as any)[columnName], "Expected values of 'columnNames' parameter to be strings when a format spec is passed in.");
            }

            assert.isUndefined(formatString, "Optional 'formatString' parameter to 'DataFrame.toStrings' should not be set when passing in a format spec.");
        }
        else {
            if (!Sugar.Object.isArray(columnNames)) {
                assert.isString(columnNames, "Expected 'columnNames' parameter to 'DataFrame.toStrings' to be a string, array of strings or format spec that specifes which columns should be converted to strings.");
            }

            if (formatString) {
                assert.isString(formatString, "Expected optional 'formatString' parameter to 'DataFrame.toStrings' to be a string (if specified).");
            }    
        }

        if (Sugar.Object.isObject(columnNames)) {
            let working: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of Object.keys(columnNames)) {
                working = working.toStrings(columnName, formatString);
            }
            
            return working;
        }
        else if (Sugar.Object.isArray(columnNames)) {
            let working: IDataFrame<IndexT, ValueT> = this;
            for (const columnName of columnNames) {
                const columnFormatString = (columnNames as any)[columnName];
                working = working.toStrings(columnName, columnFormatString);
            }
            
            return working;
        }
        else {
            const singleColumnName = columnNames as string;
            return this.withSeries(singleColumnName, this.getSeries(singleColumnName).toStrings(formatString));
        }
    }

    /**
     * Produces a new dataframe with all string values truncated to the requested maximum length.
     *
     * @param maxLength The maximum length of the string values after truncation.
     * 
     * @returns Returns a new dataframe with all strings truncated to the specified maximum length.
     * 
     * @example
     * <pre>
     * 
     * // Truncate all string columns to 100 characters maximum.
     * const truncatedDf = df.truncateString(100);
     * </pre>
     */
    truncateStrings (maxLength: number): IDataFrame<IndexT, ValueT> {
        assert.isNumber(maxLength, "Expected 'maxLength' parameter to 'truncateStrings' to be an integer.");

        return this.select((row: any) => {
            const output: any = {};
            for (const key of Object.keys(row)) {
                const value = row[key];
                if (Sugar.Object.isString(value)) {
                    output[key] = value.substring(0, maxLength);
                }
                else {
                    output[key] = value;
                }
            }
           return <ValueT> output;
        });
    }

    /**
     * Forces lazy evaluation to complete and 'bakes' the dataframe into memory.
     * 
     * @returns Returns a dataframe that has been 'baked', all lazy evaluation has completed.  
     * 
     * @example
     * <pre>
     * 
     * const bakedDf = df.bake();
     * </pre>
     */
    bake (): IDataFrame<IndexT, ValueT> {

        if (this.getContent().isBaked) {
            // Already baked.
            return this;
        }

        return new DataFrame({
            columnNames: this.getColumnNames(),
            values: this.toArray(),
            pairs: this.toPairs(),
            baked: true,
        });
    }

    /** 
     * Gets a new dataframe in reverse order.
     * 
     * @returns Returns a new dataframe that is the reverse of the input.
     * 
     * @example
     * <pre>
     * 
     * const reversedDf = df.reverse();
     * </pre>
     */
    reverse (): IDataFrame<IndexT, ValueT> {
        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new ReverseIterable(content.values),
                index: new ReverseIterable(content.index),
                pairs: new ReverseIterable(content.pairs)
            };
        });
    }

    /**
     * Returns only the set of rows in the dataframe that are distinct according to some criteria.
     * This can be used to remove duplicate rows from the dataframe.
     *
     * @param selector User-defined selector function that specifies the criteria used to make comparisons for duplicate rows.
     * 
     * @returns Returns a dataframe containing only unique values as determined by the 'selector' function. 
     * 
     * @example
     * <pre>
     * 
     * // Remove duplicate rows by customer id. Will return only a single row per customer.
     * const distinctCustomers = salesDf.distinct(sale => sale.CustomerId);
     * </pre>
     */
    distinct<ToT> (selector?: SelectorFn<ValueT, ToT>): IDataFrame<IndexT, ValueT> {
        return new DataFrame<IndexT, ValueT>(() => {
            const content = this.getContent();
            return {
                columnNames: content.columnNames,
                values: new DistinctIterable<ValueT, ToT>(content.values, selector),
                pairs: new DistinctIterable<[IndexT, ValueT],ToT>(content.pairs, (pair: [IndexT, ValueT]): ToT => selector && selector(pair[1]) || <ToT> <any> pair[1])
            };
        });
    }

    /**
     * Collects rows in the dataframe into a series of groups according to the user-defined selector function that defines the group for each row.
     *
     * @param selector User-defined selector function that defines the value to group by.
     *
     * @returns Returns a {@link Series} of groups. Each group is a dataframe with values that have been grouped by the 'selector' function.
     * 
     * @example
     * <pre>
     * 
     * const salesDf = ... product sales ...
     * const salesByProduct = salesDf.groupBy(sale => sale.ProductId);
     * for (const productSalesGroup of salesByProduct) {
     *      // ... do something with each product group ...
     *      const productId = productSalesGroup.first().ProductId;
     *      const totalSalesForProduct = productSalesGroup.deflate(sale => sale.Amount).sum();
     *      console.log(totalSalesForProduct);
     * }
     * </pre>
     */
    groupBy<GroupT> (selector: SelectorWithIndexFn<ValueT, GroupT>): ISeries<number, IDataFrame<IndexT, ValueT>> {

        assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.groupBy' to be a selector function that determines the value to group the series by.");

        return new Series<number, IDataFrame<IndexT, ValueT>>(() => {
            const groups: any[] = []; // Each group, in order of discovery.
            const groupMap: any = {}; // Group map, records groups by key.
            
            let valueIndex = 0;
    
            for (const pair of this.getContent().pairs) {
                const groupKey = selector(pair[1], valueIndex);
                ++valueIndex;
                const existingGroup = groupMap[groupKey];
                if (existingGroup) {
                    existingGroup.push(pair);
                }
                else {
                    const newGroup: any[] = [];
                    newGroup.push(pair);
                    groups.push(newGroup);
                    groupMap[groupKey] = newGroup;
                }
            }

            return {
                values: groups.map(group => new DataFrame<IndexT, ValueT>({ pairs: group }))
            };            
        });
    }
    
    /**
     * Collects rows in the dataframe into a series of groups according to a user-defined selector function that identifies adjacent rows that should be in the same group.
     *
     * @param selector Optional selector that defines the value to group by.
     *
     * @returns Returns a {@link Series} of groups. Each group is a dataframe with values that have been grouped by the 'selector' function.
     * 
     * @example
     * <pre>
     * 
     * // Some ultra simple stock trading strategy backtesting...
     * const dailyStockPriceDf = ... daily stock price for a company ...
     * const priceGroups  = dailyStockPriceDf.groupBy(day => day.close > day.movingAverage);
     * for (const priceGroup of priceGroups) {
     *      // ... do something with each stock price group ...
     * 
     *      const firstDay = priceGroup.first();
     *      if (firstDay.close > movingAverage) {
     *          // This group of days has the stock price above its moving average.
     *          // ... maybe enter a long trade here ...
     *      }
     *      else {
     *          // This group of days has the stock price below its moving average.
     *          // ... maybe enter a short trade here ...
     *      }
     * }
     * </pre>
     */
    groupSequentialBy<GroupT> (selector?: SelectorFn<ValueT, GroupT>): ISeries<number, IDataFrame<IndexT, ValueT>> {

        if (selector) {
            assert.isFunction(selector, "Expected 'selector' parameter to 'DataFrame.groupSequentialBy' to be a selector function that determines the value to group the series by.")
        }
        else {
            selector = value => <GroupT> <any> value;
        }
        
        return this.variableWindow((a: ValueT, b: ValueT): boolean => selector!(a) === selector!(b));
    }

    /**
     * Concatenate multiple dataframes into a single dataframe.
     *
     * @param dataframes Array of dataframes to concatenate.
     * 
     * @returns Returns a single dataframe concatenated from multiple input dataframes. 
     * 
     * @example
     * <pre>
     * 
     * const df1 = ...
     * const df2 = ...
     * const df3 = ...
     * const concatenatedDf = DataFrame.concat([df1, df2, df3]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const dfs = [... array of dataframes...];
     * const concatenatedDf = DataFrame.concat(dfs);
     * </pre>
     */
    static concat<IndexT = any, ValueT = any> (dataframes: IDataFrame<IndexT, ValueT>[]): IDataFrame<IndexT, ValueT > {
        assert.isArray(dataframes, "Expected 'dataframes' parameter to 'DataFrame.concat' to be an array of dataframes.");

        return new DataFrame(() => {
            const upcast = <DataFrame<IndexT, ValueT>[]> dataframes; // Upcast so that we can access private index, values and pairs.
            const contents = upcast.map(dataframe => dataframe.getContent());

            let columnNames: string[] = [];
            for (const content of contents) {
                for (const columnName of content.columnNames) {
                    columnNames.push(columnName);
                }
            }

            columnNames = makeDistinct(columnNames);

            return {
                columnNames: columnNames,
                values: new ConcatIterable(contents.map(content => content.values)),
                pairs: new ConcatIterable(contents.map(content => content.pairs)),
            };
        });    
    }
    
    /**
     * Concatenate multiple other dataframes onto this dataframe.
     * 
     * @param dataframes Multiple arguments. Each can be either a dataframe or an array of dataframes.
     * 
     * @returns Returns a single dataframes concatenated from multiple input dataframes. 
     * 
     * @example
     * <pre>
     * 
     * const concatenatedDf = dfA.concat(dfB);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const concatenatedDf = dfA.concat(dfB, dfC);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const concatenatedDf = dfA.concat([dfB, dfC]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const concatenatedDf = dfA.concat(dfB, [dfC, dfD]);
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * const otherDfs = [... array of dataframes...];
     * const concatenatedDf = dfA.concat(otherDfs);
     * </pre>
     */    
    concat (...dataframes: (IDataFrame<IndexT, ValueT>[] | IDataFrame<IndexT, ValueT>)[]): IDataFrame<IndexT, ValueT> {
        const concatInput: IDataFrame<IndexT, ValueT>[] = [this];

        for (const input of dataframes) {
            if (Sugar.Object.isArray(input)) {
                for (const subInput of input) {
                    concatInput.push(subInput);
                }
            }
            else {
                concatInput.push(input);
            }
        }

        return DataFrame.concat<IndexT, ValueT>(concatInput);
    }
   
    /**
    * Zip (or merge) together multiple dataframes to create a new dataframe.
    * Preserves the index of the first dataframe.
    *
    * @param dataframes Array of input dataframes to be zipped together.
    * @param zipper User-defined zipper function that merges rows. It produces rows for the new dataframe based-on rows from the input dataframes.
    * 
    * @returns Returns a single dataframe zipped (or merged) from multiple input dataframes. 
    * 
    * @example
    * <pre>
    * 
    * function produceNewRow (rowA, rowB) {
    *       const outputRow = {
    *           // Produce output row based on the contents of the input rows.
    *       };
    *       return outputRow;
    * }
    * 
    * const inputDfs = [... array of input dataframes ...];
    * const zippedDf = DataFrame.zip(inputDfs, produceNewRow);
    * 
    * </pre>
    * 
    * @example
    * <pre>
    * 
    * function produceNewRow (rowA, rowB) {
    *       const outputRow = {
    *           ValueA: rowA.Value,
    *           ValueB: rowB.Value,
    *       };
    *       return outputRow;
    * }
    * 
    * const dfA = new DataFrame([ { Value: 10 }, { Value: 20 }, { Value: 30 }]);
    * const dfB = new DataFrame([ { Value: 100 }, { Value: 200 }, { Value: 300 }]);
    * const zippedDf = DataFrame.zip([dfA, dfB], produceNewRow);
    * </pre>
    */
    static zip<IndexT = any, ValueT = any, ResultT = any> (dataframes: IDataFrame<IndexT, ValueT>[], zipper: ZipNFn<ValueT, ResultT>): IDataFrame<IndexT, ResultT> {

        assert.isArray(dataframes, "Expected 'dataframe' parameter to 'DataFrame.zip' to be an array of dataframes.");

        if (dataframes.length === 0) {
            return new DataFrame<IndexT, ResultT>();
        }

        const firstSeries = dataframes[0];
        if (firstSeries.none()) {
            return new DataFrame<IndexT, ResultT>();
        }

        return new DataFrame<IndexT, ResultT>(() => {
            const firstSeriesUpCast = <DataFrame<IndexT, ValueT>> firstSeries;
            const upcast = <DataFrame<IndexT, ValueT>[]> dataframes; // Upcast so that we can access private index, values and pairs.
            
            return {
                index: <Iterable<IndexT>> firstSeriesUpCast.getContent().index,
                values: new ZipIterable<ValueT, ResultT>(upcast.map(s => s.getContent().values), zipper),
            };
        });
    }
    
    /**
    * Zip (or merge) together multiple dataframes to create a new dataframe.
    * Preserves the index of the first dataframe.
    * 
    * @param s2, s3, s4, s4 Multiple dataframes to zip.
    * @param zipper User-defined zipper function that merges rows. It produces rows for the new dataframe based-on rows from the input dataframes.
    * 
    * @returns Returns a single dataframe zipped (or merged) from multiple input dataframes. 
    * 
    * @example
    * <pre>
    * 
    * function produceNewRow (rowA, rowB) {
    *       const outputRow = {
    *           ValueA: rowA.Value,
    *           ValueB: rowB.Value,
    *       };
    *       return outputRow;
    * }
    * 
    * const dfA = new DataFrame([ { Value: 10 }, { Value: 20 }, { Value: 30 }]);
    * const dfB = new DataFrame([ { Value: 100 }, { Value: 200 }, { Value: 300 }]);
    * const zippedDf = dfA.zip(dfB, produceNewRow);
    * </pre>
    */    
    zip<Index2T, Value2T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, zipper: Zip2Fn<ValueT, Value2T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<Index2T, Value2T, Index3T, Value3T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, s3: IDataFrame<Index3T, Value3T>, zipper: Zip3Fn<ValueT, Value2T, Value3T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<Index2T, Value2T, Index3T, Value3T, Index4T, Value4T, ResultT>  (s2: IDataFrame<Index2T, Value2T>, s3: IDataFrame<Index3T, Value3T>, s4: IDataFrame<Index4T, Value4T>, zipper: Zip3Fn<ValueT, Value2T, Value3T, ResultT> ): IDataFrame<IndexT, ResultT>;
    zip<ResultT>  (...args: any[]): IDataFrame<IndexT, ResultT> {

        const selector: Function = args[args.length-1];
        const input: IDataFrame<IndexT, any>[] = [this].concat(args.slice(0, args.length-1));
        return DataFrame.zip<IndexT, any, ResultT>(input, values => selector(...values));
    }    

    /**
     * Sorts the dataframe in ascending order by a value defined by the user-defined selector function. 
     * 
     * @param selector User-defined selector function that selects the value to sort by.
     * 
     * @returns Returns a new dataframe that has been ordered accorrding to the value chosen by the selector function. 
     * 
     * @example
     * <pre>
     * 
     * // Order sales by amount from least to most.
     * const orderedDf = salesDf.orderBy(sale => sale.Amount); 
     * </pre>
     */
    orderBy<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT> {
        //TODO: Should pass a config fn to OrderedSeries.
        return new OrderedDataFrame<IndexT, ValueT, SortT>(this.getContent().values, this.getContent().pairs, selector, Direction.Ascending, null);
    }

    /**
     * Sorts the dataframe in descending order by a value defined by the user-defined selector function. 
     * 
     * @param selector User-defined selector function that selects the value to sort by.
     * 
     * @returns Returns a new dataframe that has been ordered accorrding to the value chosen by the selector function. 
     * 
     * @example
     * <pre>
     * 
     * // Order sales by amount from most to least
     * const orderedDf = salesDf.orderByDescending(sale => sale.Amount); 
     * </pre>
     */
    orderByDescending<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT> {
        //TODO: Should pass a config fn to OrderedSeries.
        return new OrderedDataFrame<IndexT, ValueT, SortT>(this.getContent().values, this.getContent().pairs, selector, Direction.Descending, null);
    }
        
    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains the union of rows from the two input dataframes.
     * These are the unique combination of rows in both dataframe.
     * This is basically a concatenation and then elimination of duplicates.
     *
     * @param other The other dataframes to merge.
     * @param [selector] Optional user-defined selector function that selects the value to compare to detemrine distinctness.
     * 
     * @returns Returns the union of the two dataframes.
     * 
     * @example
     * <pre>
     *
     * const dfA = ...
     * const dfB = ...
     * const merged = dfA.union(dfB);
     * </pre>
     * 
     * @example
     * <pre>
     *
     * // Merge two sets of customer records that may contain the same
     * // customer record in each set. This is basically a concatenation
     * // of the dataframes and then an elimination of any duplicate records
     * // that result.
     * const customerRecordsA = ...
     * const customerRecordsB = ...
     * const mergedCustomerRecords = customerRecordsA.union(
     *      customerRecordsB, 
     *      customerRecord => customerRecord.CustomerId
     * );
     * </pre>
     * 
     * 
     * @example
     * <pre>
     *
     * // Note that you can achieve the exact same result as the previous
     * // example by doing a {@link DataFrame.concat) and {@link DataFrame.distinct}
     * // of the dataframes and then an elimination of any duplicate records
     * // that result.
     * const customerRecordsA = ...
     * const customerRecordsB = ...
     * const mergedCustomerRecords = customerRecordsA
     *      .concat(customerRecordsB)
     *      .distinct(customerRecord => customerRecord.CustomerId);
     * </pre>
     * 
     */
    union<KeyT = ValueT> (
        other: IDataFrame<IndexT, ValueT>, 
        selector?: SelectorFn<ValueT, KeyT>): 
            IDataFrame<IndexT, ValueT> {

        if (selector) {
            assert.isFunction(selector, "Expected optional 'selector' parameter to 'DataFrame.union' to be a selector function.");
        }

        return this.concat(other).distinct(selector);
    };

    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains the intersection of rows from the two input dataframes.
     * These are only the rows that appear in both dataframes.
     *
     * @param inner The inner dataframe to merge (the dataframe you call the function on is the 'outer' dataframe).
     * @param [outerSelector] Optional user-defined selector function that selects the key from the outer dataframe that is used to match the two dataframes.
     * @param [innerSelector] Optional user-defined selector function that selects the key from the inner dataframe that is used to match the two dataframes.
     * 
     * @returns Returns a new dataframe that contains the intersection of rows from the two input dataframes.
     * 
     * @example
     * <pre>
     * 
     * const dfA = ...
     * const dfB = ...
     * const mergedDf = dfA.intersection(dfB);
     * </pre>
     * 
     * @example
     * <pre>
     *
     * // Merge two sets of customer records to find only the
     * // customers that appears in both.
     * const customerRecordsA = ...
     * const customerRecordsB = ...
     * const intersectionOfCustomerRecords = customerRecordsA.intersection(
     *      customerRecordsB, 
     *      customerRecord => customerRecord.CustomerId
     * );
     * </pre>     
     * */
    intersection<InnerIndexT = IndexT, InnerValueT = ValueT, KeyT = ValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerSelector?: SelectorFn<ValueT, KeyT>,
        innerSelector?: SelectorFn<InnerValueT, KeyT>): 
            IDataFrame<IndexT, ValueT> {

        if (outerSelector) {
            assert.isFunction(outerSelector, "Expected optional 'outerSelector' parameter to 'DataFrame.intersection' to be a function.");
        }
        else {
            outerSelector = value => <KeyT> <any> value;
        }
        
        if (innerSelector) {
            assert.isFunction(innerSelector, "Expected optional 'innerSelector' parameter to 'DataFrame.intersection' to be a function.");
        }
        else {
            innerSelector = value => <KeyT> <any> value;
        }

        const outer = this;
        return outer.where(outerValue => {
                const outerKey = outerSelector!(outerValue);
                return inner
                    .where(innerValue => outerKey === innerSelector!(innerValue))
                    .any();
            });
    };

    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains only the rows from the 1st dataframe that don't appear in the 2nd dataframe.
     * This is essentially subtracting the rows from the 2nd dataframe from the 1st and creating a new dataframe with the remaining rows.
     *
     * @param inner The inner dataframe to merge (the dataframe you call the function on is the 'outer' dataframe).
     * @param [outerSelector] Optional user-defined selector function that selects the key from the outer dataframe that is used to match the two dataframes.
     * @param [innerSelector] Optional user-defined selector function that selects the key from the inner dataframe that is used to match the two dataframes.
     * 
     * @returns Returns a new dataframe that contains only the rows from the 1st dataframe that don't appear in the 2nd dataframe.
     * 
     * @example
     * <pre>
     * 
     * const dfA = ...
     * const dfB = ...
     * const remainingDf = dfA.except(dfB);
     * </pre>
     * 
     * @example
     * <pre>
     *
     * // Find the list of customers haven't bought anything recently.
     * const allCustomers = ... list of all customers ...
     * const recentCustomers = ... list of customers who have purchased recently ...
     * const remainingCustomers = allCustomers.except(
     *      recentCustomers, 
     *      customerRecord => customerRecord.CustomerId
     * );
     * </pre>
     */
    except<InnerIndexT = IndexT, InnerValueT = ValueT, KeyT = ValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerSelector?: SelectorFn<ValueT, KeyT>,
        innerSelector?: SelectorFn<InnerValueT, KeyT>): 
            IDataFrame<IndexT, ValueT> {

        if (outerSelector) {
            assert.isFunction(outerSelector, "Expected optional 'outerSelector' parameter to 'DataFrame.except' to be a function.");
        }
        else {
            outerSelector = value => <KeyT> <any> value;
        }

        if (innerSelector) {
            assert.isFunction(innerSelector, "Expected optional 'innerSelector' parameter to 'DataFrame.except' to be a function.");
        }
        else {
            innerSelector = value => <KeyT> <any> value;
        }

        const outer = this;
        return outer.where(outerValue => {
                const outerKey = outerSelector!(outerValue);
                return inner
                    .where(innerValue => outerKey === innerSelector!(innerValue))
                    .none();
            });
    };

   /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains only those rows that have matching keys in both input dataframes.
     *
     * @param inner The 'inner' dataframe to join (the dataframe you are callling the function on is the 'outer' dataframe).
     * @param outerKeySelector User-defined selector function that chooses the join key from the outer dataframe.
     * @param innerKeySelector User-defined selector function that chooses the join key from the inner dataframe.
     * @param resultSelector User-defined function that merges outer and inner values.
     * 
     * @returns Returns the new merged dataframe.
     * 
     * @example
     * <pre>
     * 
     * // Join together two sets of customers to find those
     * // that have bought both product A and product B.
     * const customerWhoBoughtProductA = ...
     * const customerWhoBoughtProductB = ...
     * const customersWhoBoughtBothProductsDf = customerWhoBoughtProductA.join(
     *          customerWhoBoughtProductB,
     *          customerA => customerA.CustomerId, // Join key.
     *          customerB => customerB.CustomerId, // Join key.
     *          (customerA, customerB) => {
     *              return {
     *                  // ... merge the results ...
     *              };
     *          }
     *      );
     * </pre>
     */
    join<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT, InnerValueT, ResultValueT>):
            IDataFrame<number, ResultValueT> {

        assert.isFunction(outerKeySelector, "Expected 'outerKeySelector' parameter of 'DataFrame.join' to be a selector function.");
        assert.isFunction(innerKeySelector, "Expected 'innerKeySelector' parameter of 'DataFrame.join' to be a selector function.");
        assert.isFunction(resultSelector, "Expected 'resultSelector' parameter of 'DataFrame.join' to be a selector function.");

        const outer = this;

        return new DataFrame<number, ResultValueT>(() => {
            const innerMap = inner
                .groupBy(innerKeySelector)
                .toObject(
                    group => innerKeySelector(group.first()), 
                    group => group
                );

            const outerContent = outer.getContent();

            const output: ResultValueT[] = [];
            
            for (const outerValue of outer) { //TODO: There should be an enumerator that does this.
                const outerKey = outerKeySelector(outerValue);
                const innerGroup = innerMap[outerKey];
                if (innerGroup) {
                    for (const innerValue of innerGroup) {
                        output.push(resultSelector(outerValue, innerValue));
                    }    
                }
            }

            return {
                values: output
            };
        });
    }

    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains only those rows that are only present in or or the other of the dataframes, not both.
     *
     * @param inner The 'inner' dataframe to join (the dataframe you are callling the function on is the 'outer' dataframe).
     * @param outerKeySelector User-defined selector function that chooses the join key from the outer dataframe.
     * @param innerKeySelector User-defined selector function that chooses the join key from the inner dataframe.
     * @param resultSelector User-defined function that merges outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the new merged dataframe.
     * 
     * @example
     * <pre>
     * 
     * // Join together two sets of customers to find those
     * // that have bought either product A or product B, not not both.
     * const customerWhoBoughtProductA = ...
     * const customerWhoBoughtProductB = ...
     * const customersWhoBoughtEitherProductButNotBothDf = customerWhoBoughtProductA.joinOuter(
     *          customerWhoBoughtProductB,
     *          customerA => customerA.CustomerId, // Join key.
     *          customerB => customerB.CustomerId, // Join key.
     *          (customerA, customerB) => {
     *              return {
     *                  // ... merge the results ...
     *              };
     *          }
     *      );
     * </pre>
     */
    joinOuter<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT> {

        assert.isFunction(outerKeySelector, "Expected 'outerKeySelector' parameter of 'DataFrame.joinOuter' to be a selector function.");
        assert.isFunction(innerKeySelector, "Expected 'innerKeySelector' parameter of 'DataFrame.joinOuter' to be a selector function.");
        assert.isFunction(resultSelector, "Expected 'resultSelector' parameter of 'DataFrame.joinOuter' to be a selector function.");

        // Get the results in the outer that are not in the inner.
        const outer = this;
        const outerResult = outer.except<InnerIndexT, InnerValueT, KeyT>(inner, outerKeySelector, innerKeySelector)
            .select(outer => resultSelector(outer, null))
            .resetIndex();

        // Get the results in the inner that are not in the outer.
        const innerResult = inner.except<IndexT, ValueT, KeyT>(outer, innerKeySelector, outerKeySelector)
            .select(inner => resultSelector(null, inner))
            .resetIndex();

        // Get the intersection of results between inner and outer.
        const intersectionResults = outer.join<KeyT, InnerIndexT, InnerValueT, ResultValueT>(inner, outerKeySelector, innerKeySelector, resultSelector);

        return outerResult
            .concat(intersectionResults)
            .concat(innerResult)
            .resetIndex();
    };

    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains only those rows that present either in both dataframes or only in the outer (left) dataframe.
     * 
     * @param inner The 'inner' dataframe to join (the dataframe you are callling the function on is the 'outer' dataframe).
     * @param outerKeySelector User-defined selector function that chooses the join key from the outer dataframe.
     * @param innerKeySelector User-defined selector function that chooses the join key from the inner dataframe.
     * @param resultSelector User-defined function that merges outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the new merged dataframe.
     * 
     * @example
     * <pre>
     * 
     * // Join together two sets of customers to find those
     * // that have bought either just product A or both product A and product B.
     * const customerWhoBoughtProductA = ...
     * const customerWhoBoughtProductB = ...
     * const boughtJustAorAandB = customerWhoBoughtProductA.joinOuterLeft(
     *          customerWhoBoughtProductB,
     *          customerA => customerA.CustomerId, // Join key.
     *          customerB => customerB.CustomerId, // Join key.
     *          (customerA, customerB) => {
     *              return {
     *                  // ... merge the results ...
     *              };
     *          }
     *      );
     * </pre>
     */
    joinOuterLeft<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT> {

        assert.isFunction(outerKeySelector, "Expected 'outerKeySelector' parameter of 'DataFrame.joinOuterLeft' to be a selector function.");
        assert.isFunction(innerKeySelector, "Expected 'innerKeySelector' parameter of 'DataFrame.joinOuterLeft' to be a selector function.");
        assert.isFunction(resultSelector, "Expected 'resultSelector' parameter of 'DataFrame.joinOuterLeft' to be a selector function.");

        // Get the results in the outer that are not in the inner.
        const outer = this;
        const outerResult = outer.except<InnerIndexT, InnerValueT, KeyT>(inner, outerKeySelector, innerKeySelector)
            .select(outer => resultSelector(outer, null))
            .resetIndex();

        // Get the intersection of results between inner and outer.
        const intersectionResults = outer.join<KeyT, InnerIndexT, InnerValueT, ResultValueT>(inner, outerKeySelector, innerKeySelector, resultSelector);

        return outerResult
            .concat(intersectionResults)
            .resetIndex();
    };

    /**
     * Creates a new dataframe by merging two input dataframes.
     * The resulting dataframe contains only those rows that present either in both dataframes or only in the inner (right) dataframe.
     *
     * @param inner The 'inner' dataframe to join (the dataframe you are callling the function on is the 'outer' dataframe).
     * @param outerKeySelector User-defined selector function that chooses the join key from the outer dataframe.
     * @param innerKeySelector User-defined selector function that chooses the join key from the inner dataframe.
     * @param resultSelector User-defined function that merges outer and inner values.
     * 
     * Implementation from here:
     * 
     * 	http://blogs.geniuscode.net/RyanDHatch/?p=116
     * 
     * @returns Returns the new merged dataframe.
     * 
     * @example
     * <pre>
     * 
     * // Join together two sets of customers to find those
     * // that have bought either just product B or both product A and product B.
     * const customerWhoBoughtProductA = ...
     * const customerWhoBoughtProductB = ...
     * const boughtJustAorAandB = customerWhoBoughtProductA.joinOuterRight(
     *          customerWhoBoughtProductB,
     *          customerA => customerA.CustomerId, // Join key.
     *          customerB => customerB.CustomerId, // Join key.
     *          (customerA, customerB) => {
     *              return {
     *                  // ... merge the results ...
     *              };
     *          }
     *      );
     * </pre>
     */
    joinOuterRight<KeyT, InnerIndexT, InnerValueT, ResultValueT> (
        inner: IDataFrame<InnerIndexT, InnerValueT>, 
        outerKeySelector: SelectorFn<ValueT, KeyT>, 
        innerKeySelector: SelectorFn<InnerValueT, KeyT>, 
        resultSelector: JoinFn<ValueT | null, InnerValueT | null, ResultValueT>):
            IDataFrame<number, ResultValueT> {

        assert.isFunction(outerKeySelector, "Expected 'outerKeySelector' parameter of 'DataFrame.joinOuterRight' to be a selector function.");
        assert.isFunction(innerKeySelector, "Expected 'innerKeySelector' parameter of 'DataFrame.joinOuterRight' to be a selector function.");
        assert.isFunction(resultSelector, "Expected 'resultSelector' parameter of 'DataFrame.joinOuterRight' to be a selector function.");

        // Get the results in the inner that are not in the outer.
        const outer = this;
        const innerResult = inner.except<IndexT, ValueT, KeyT>(outer, innerKeySelector, outerKeySelector)
            .select(inner => resultSelector(null, inner))
            .resetIndex();

        // Get the intersection of results between inner and outer.
        const intersectionResults = outer.join<KeyT, InnerIndexT, InnerValueT, ResultValueT>(inner, outerKeySelector, innerKeySelector, resultSelector);

        return intersectionResults
            .concat(innerResult)
            .resetIndex();
    }    

    /**
     * Reshape (or pivot) a dataframe based on column values.
     * This is short-hand that combines grouping, aggregation and sorting.
     *
     * @param columnOrColumns Column name whose values make the new DataFrame's columns.
     * @param valueColumnNameOrSpec Column name or column spec that defines the columns whose values should be aggregated.
     * @param [aggregator] Optional function used to aggregate pivotted vales. 
     *
     * @returns Returns a new dataframe that has been pivoted based on a particular column's values. 
     * 
     * @example
     * <pre>
     * 
     * // Simplest example.
     * // Group by the values in 'PivotColumn'.
     * // The unique set of values in 'PivotColumn' becomes the columns in the resulting dataframe.
     * // The column 'ValueColumn' is averaged for each group and this becomes the 
     * // values in the new column.
     * const pivottedDf = df.pivot("PivotColumn", "ValueColumn", values => values.average());
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * // Multi-value column example.
     * // Similar to the previous example except now we are aggregating multiple value columns.
     * // Each group has the average computed for 'ValueColumnA' and the sum for 'ValueColumnB'.
     * const pivottedDf = df.pivot("PivotColumn", { 
     *      "ValueColumnA": aValues => aValues.average(),
     *      "ValueColumnB":  bValues => bValues.sum(),
     * });
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * // Full multi-column example.
     * // Similar to the previous example now we are pivotting on multiple columns.
     * // We now group by the 'PivotColumnA' and then by 'PivotColumnB', effectively creating a 
     * // multi-level group.
     * const pivottedDf = df.pivot(["PivotColumnA", "PivotColumnB" ], { 
     *      "ValueColumnA": aValues => aValues.average(),
     *      "ValueColumnB":  bValues => bValues.sum(),
     * });
     * </pre>
     * 
     * @example
     * <pre>
     * 
     * // To help understand the pivot function, let's look at what it does internally.
     * // Take the simplest example:
     * const pivottedDf = df.pivot("PivotColumn", "ValueColumn", values => values.average());
     * 
     * // If we expand out the internals of the pivot function, it will look something like this:
     * const pivottedDf = df.groupBy(row => row.PivotColumn)
     *          .select(group => ({
     *              PivotColumn: group.deflate(row.ValueColumn).average()
     *          }))
     *          .orderBy(row  => row.PivotColumn);
     * 
     * // You can see that pivoting a dataframe is the same as grouping, aggregating and sorting it.
     * // Does pivoting seem simpler now?
     * 
     * // It gets more complicated than that of course, because the pivot function supports multi-level nested 
     * // grouping and aggregation of multiple columns. So a full expansion of the pivot function is rather complex.
     * </pre>
     */
    pivot<NewValueT = ValueT> (
        columnOrColumns: string | Iterable<string>, 
        valueColumnNameOrSpec: string | IPivotAggregateSpec, 
        aggregator?: (values: ISeries<number, any>) => any
            ): IDataFrame<number, NewValueT> {

        let columnNames: string[];

        if (Sugar.Object.isString(columnOrColumns)) {
            columnNames = [columnOrColumns];
        }
        else {
            assert.isArray(columnOrColumns, "Expected 'columnOrColumns' parameter to 'DataFrame.pivot' to be a string or an array of strings that identifies the column(s) whose values make the new DataFrame's columns.");

            columnNames = Array.from(columnOrColumns);

            assert(columnNames.length > 0, "Expected 'columnOrColumns' parameter to 'DataFrame.pivot' to contain at least one string.");

            for (const columnName of columnNames) {
                assert.isString(columnName, "Expected 'columnOrColumns' parameter to 'DataFrame.pivot' to be an array of strings, each string identifies a column in the DataFrame on which to pivot.");
            }
        }

        let aggSpec: IPivotAggregateSpec;

        if (!Sugar.Object.isObject(valueColumnNameOrSpec)) {
            assert.isString(valueColumnNameOrSpec, "Expected 'value' parameter to 'DataFrame.pivot' to be a string that identifies the column whose values to aggregate or a column spec that defines which column contains the value ot aggregate and the ways to aggregate that value.");
            assert.isFunction(aggregator, "Expected 'aggregator' parameter to 'DataFrame.pivot' to be a function to aggegrate pivoted values.");

            const aggColumnName = valueColumnNameOrSpec as string;

            const outputSpec: IAggregatorSpec = {};
            outputSpec[aggColumnName] = aggregator!;

            aggSpec = {};
            aggSpec[aggColumnName] = outputSpec;
        }
        else {
            aggSpec = valueColumnNameOrSpec as IPivotAggregateSpec;
        }

        const firstColumnName = columnNames[0];
        let working = this.groupBy((row: any) => row[firstColumnName])
            .select(group => {
                const output: any = {};
                output[firstColumnName] = (group.first() as any)[firstColumnName];
                output.src = group;
                return output;
            });

        for (let columnNameIndex = 1; columnNameIndex < columnNames.length; ++columnNameIndex) {
            const nextColumnName = columnNames[columnNameIndex];
            working = working.selectMany(parentGroup => {
                    const src: IDataFrame<IndexT, ValueT> = parentGroup.src;
                    return src.groupBy((row: any) => row[nextColumnName])
                        .select(subGroup => {
                            const output = Object.assign({}, parentGroup);
                            output[nextColumnName] = (subGroup.first() as any)[nextColumnName];
                            output.src = subGroup;
                            return output;
                        });
                });
        }

        const valueColumnNames = Object.keys(aggSpec);
        const outputColumnsMap = toMap(
            valueColumnNames, 
            valueColumnName => valueColumnName, 
            valueColumnName => Object.keys(aggSpec[valueColumnName])
        );
        
        const pivotted = working.inflate<NewValueT>((row: any) => {
            for (const valueColumnName of valueColumnNames) {
                const outputColumnNames = outputColumnsMap[valueColumnName];
                for (const outputColumName of outputColumnNames) {
                    const aggregatorFn = aggSpec[valueColumnName][outputColumName];
                    row[outputColumName] = aggregatorFn(row.src.deflate((srcRow: any) => srcRow[valueColumnName])) 
                }
            }

            delete row.src;
            return row;
        });

        let ordered = pivotted.orderBy((row: any) => row[firstColumnName]);
        for (let columnNameIndex = 1; columnNameIndex < columnNames.length; ++columnNameIndex) {
            const nextColumnName = columnNames[columnNameIndex];
            ordered = ordered.thenBy((row: any) => row[nextColumnName]);
        }

        return ordered;
    }
    
    
    /**
     * Insert a pair at the start of the dataframe.
     *
     * @param pair - The pair to insert.
     * 
     * @returns Returns a new dataframe with the specified pair inserted.
     */
    insertPair (pair: [IndexT, ValueT]): IDataFrame<IndexT, ValueT> {
        assert.isArray(pair, "Expected 'pair' parameter to 'DataFrame.insertPair' to be an array.");
        assert(pair.length === 2, "Expected 'pair' parameter to 'DataFrame.insertPair' to be an array with two elements. The first element is the index, the second is the value.");

        return (new DataFrame<IndexT, ValueT>({ pairs: [pair] })).concat(this);
    }

    /**
     * Append a pair to the end of a dataframe.
     *
     * @param pair - The pair to append.
     *  
     * @returns Returns a new dataframe with the specified pair appended.
     */
    appendPair (pair: [IndexT, ValueT]): IDataFrame<IndexT, ValueT> {
        assert.isArray(pair, "Expected 'pair' parameter to 'DataFrame.appendPair' to be an array.");
        assert(pair.length === 2, "Expected 'pair' parameter to 'DataFrame.appendPair' to be an array with two elements. The first element is the index, the second is the value.");

        return this.concat(new DataFrame<IndexT, ValueT>({ pairs: [pair] }));
    }

    /**
     * Fill gaps in a dataframe.
     *
     * @param comparer - Comparer that is passed pairA and pairB, two consecutive rows, return truthy if there is a gap between the rows, or falsey if there is no gap.
     * @param generator - Generator that is passed pairA and pairB, two consecutive rows, returns an array of pairs that fills the gap between the rows.
     *
     * @returns Returns a new dataframe with gaps filled in.
     */
    fillGaps (comparer: ComparerFn<[IndexT, ValueT], [IndexT, ValueT]>, generator: GapFillFn<[IndexT, ValueT], [IndexT, ValueT]>): IDataFrame<IndexT, ValueT> {
        assert.isFunction(comparer, "Expected 'comparer' parameter to 'DataFrame.fillGaps' to be a comparer function that compares two values and returns a boolean.")
        assert.isFunction(generator, "Expected 'generator' parameter to 'DataFrame.fillGaps' to be a generator function that takes two values and returns an array of generated pairs to span the gap.")

        return this.rollingWindow(2)
            .selectMany((window): [IndexT, ValueT][] => {
                const pairs = window.toPairs();
                const pairA = pairs[0];
                const pairB = pairs[1];
                if (!comparer(pairA, pairB)) {
                    return [pairA];
                }

                const generatedRows = generator(pairA, pairB);
                assert.isArray(generatedRows, "Expected return from 'generator' parameter to 'DataFrame.fillGaps' to be an array of pairs, instead got a " + typeof(generatedRows));

                return [pairA].concat(generatedRows);
            })
            .withIndex(pair => pair[0])
            .inflate(pair => pair[1])
            .concat(this.tail(1));
    }

    /**
     * Returns the specified default sequence if the dataframe is empty. 
     *
     * @param defaultSequence - Default sequence to return if the dataframe is empty.
     * 
     * @returns Returns 'defaultSequence' if the dataframe is empty. 
     */
    defaultIfEmpty (defaultSequence: ValueT[] | IDataFrame<IndexT, ValueT>): IDataFrame<IndexT, ValueT> {

        if (this.none()) {
            if (defaultSequence instanceof DataFrame) {
                return <IDataFrame<IndexT, ValueT>> defaultSequence;
            }
            else if (Sugar.Object.isArray(defaultSequence)) {
                return new DataFrame<IndexT, ValueT>(defaultSequence);
            }
            else {
                throw new Error("Expected 'defaultSequence' parameter to 'DataFrame.defaultIfEmpty' to be an array or a series.");
            }
        } 
        else {
            return this;
        }
    }

    /**
     * Detect the the frequency of the types of the values in the dataframe.
     *
     * @returns Returns a dataframe that describes the data types contained in the dataframe.
     */
    detectTypes (): IDataFrame<number, ITypeFrequency> {
        return new DataFrame<number, ITypeFrequency>(() => {
            const typeFrequencies = this.getColumns()
                .selectMany(column => {
                    return column.series.detectTypes()
                        .select((typeFrequency: any) => {
                            const output = Object.assign({}, typeFrequency);
                            output.Column = column.name;
                            return output;
                        });
                });
            return {
                columnNames: ["Type", "Frequency", "Column"],
                values: typeFrequencies,
            };
        });
    }
    
    /**
     * Detect the frequency of the values in the dataframe.
     *
     * @returns Returns a dataframe that describes the values contained in the dataframe.
     */
    detectValues (): IDataFrame<number, IValueFrequency> {
        return new DataFrame<number, IValueFrequency>(() => {
            const valueFrequencies = this.getColumns()
                .selectMany(column => {
                    return column.series.detectValues()
                        .select((valueFrequency: any) => {
                            const output = Object.assign({}, valueFrequency);
                            output.Column = column.name;
                            return output;
                        });
                });
            return {
                columnNames: ["Value", "Frequency", "Column"],
                values: valueFrequencies,
            };
        });
    }

    /**
     * Serialize the dataframe to JSON.
     * 
     *  @returns Returns a JSON format string representing the dataframe.   
     */
    toJSON (): string {
        return JSON.stringify(this.toArray(), null, 4);
    }

    /**
     * Serialize the dataframe to CSV.
     * 
     *  @returns Returns a CSV format string representing the dataframe.   
     */
    toCSV (): string {

        const data = [this.getColumnNames()].concat(this.toRows());
        return PapaParse.unparse(data);
    }

    /**
     * Treat the dataframe as CSV data for purposes of serialization.
     * 
     * @returns Returns an object that represents the dataframe for serialization in the CSV format. Call `writeFile`, `writeFileSync` to output the dataframe via different media.
     */
    asCSV (): ICsvSerializer {
        return new CsvSerializer<IndexT, ValueT>(this);
    }

    /**
     * Treat the dataframe as JSON data for purposes of serialization.
     * 
     * @returns Returns an object that can serialize the dataframe in the JSON format. Call `writeFile` or `writeFileSync` to output the dataframe via different media.
     */
    asJSON (): IJsonSerializer {
        return new JsonSerializer<IndexT, ValueT>(this);        
    }

    /**
     * Serialize the data frame to HTML.
     * 
     *  @returns Returns a HTML format string representing the dataframe.   
     */
    toHTML (): string {

        const columNames = this.getColumnNames();
        const header = columNames.map(columnName => "            <th>" + columnName + "</th>").join("\n");
        const pairs = this.toPairs();

        return '<table border="1" class="dataframe">\n' + 
            '    <thead>\n' +
            '        <tr style="text-align: right;">\n' +
            '            <th></th>\n' +

            header +

            '\n' +
            '       </tr>\n' +
            '    </thead>\n' +
            '    <tbody>\n' +

            pairs.map(pair => {
                const index = pair[0];
                const value: any = pair[1];
                return '        <tr>\n' +
                    '            <th>' + index + '</th>\n' +
                    columNames.map(columName => {
                            return '            <td>' + value[columName] + '</td>';
                        })
                        .join('\n') +
                        '\n' +
                        '        </tr>';
                })
                .join('\n') +

            '\n' +
            '    </tbody>\n' +
            '</table>';
    }    

    /**
     * Serialize the dataframe to an ordinary JavaScript data structure.
     */
    serialize (): any {
        const values = this.toArray();
        const index = this.getIndex();
        const indices = index.head(values.length).toArray();
        const columns = this.getColumns();
        const serializedColumns = toMap(columns, column => column.name, column => column.type);
        
        if (values.length > 0) {
            serializedColumns.__index__ = index.getType();
        }

        const serializedValues = values.map((value, valueindex) => 
            Object.assign({}, value, { __index__: indices[valueindex] })
        );

        // Serialize date values.
        for (const column of columns) {
            if (column.type === "date") {
                for (const serializedValue of serializedValues) {
                    serializedValue[column.name] = moment(serializedValue[column.name]).toISOString(true);
                }
            }
        }
        
        return {
            columnOrder: this.getColumnNames(),
            columns: serializedColumns,
            values: serializedValues,
        };
    }

    /**
     * Deserialize the dataframe from an ordinary JavaScript data structure.
     */
    static deserialize<IndexT = any,  ValueT = any> (input: any): IDataFrame<IndexT, ValueT> {

        const deserializedValues = input.values && input.values.map((row: any) => {
                const clone = Object.assign({}, row);
                delete clone.__index__;
                return clone;
            }) || [];

        // Deserialize dates.
        if (input.columns) {
            for (const columnName of Object.keys(input.columns)) {
                if (input.columns[columnName] !== "date") {
                    continue; // No need to process other types, they are natively supporte dby JSON.
                }
    
                for (const deserializedValue of deserializedValues) {
                    deserializedValue[columnName] = moment(deserializedValue[columnName], moment.ISO_8601).toDate();
                }
            }
        }

        return new DataFrame<IndexT, ValueT>({
            columnNames: input.columnOrder || [],
            index: input.values && input.values.map((row: any) => row.__index__) || [],
            values: deserializedValues,
        });
    }

    getTypeCode (): string {
        return "dataframe";
    }
}

/** 
 * Packages a dataframe ready for CSV serialization.
 * */
export interface ICsvSerializer {

    /**
     * Serialize the dataframe to a CSV file in the local file system.
     * Asynchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     * 
     *  @returns Returns a promise that resolves when the file has been written.   
     */
    writeFile (filePath: string): Promise<void>;

    /**
     * Serialize the dataframe to a CSV file in the local file system.
     * Synchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     */
    writeFileSync (filePath: string): void;
}

/**
 * @hidden
 * Packages a dataframe ready for CSV serialization.
 */
class CsvSerializer<IndexT, ValueT> implements ICsvSerializer {

    dataframe: IDataFrame<IndexT, ValueT>;

    constructor (dataframe: IDataFrame<IndexT, ValueT>) {
        this.dataframe = dataframe;
    }
    
    /**
     * Serialize the dataframe to a CSV file in the local file system.
     * Asynchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     * 
     *  @returns Returns a promise that resolves when the file has been written.   
     */
    writeFile (filePath: string): Promise<void> {
        assert.isString(filePath, "Expected 'filePath' parameter to 'DataFrame.asCSV().writeFile' to be a string that specifies the path of the file to write to the local file system.");

        return new Promise((resolve, reject) => {
            var fs = require('fs');	
            fs.writeFile(filePath, this.dataframe.toCSV(), (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Serialize the dataframe to a CSV file in the local file system.
     * Synchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     */
    writeFileSync (filePath: string): void {
        assert.isString(filePath, "Expected 'filePath' parameter to 'DataFrame.asCSV().writeFileSync' to be a string that specifies the path of the file to write to the local file system.");

        var fs = require('fs');	
        fs.writeFileSync(filePath, this.dataframe.toCSV());
    }
}

/**
 * Packages a dataframe ready for JSON serialization.
 */
export interface IJsonSerializer {

    /**
     * Serialize the dataframe to a JSON file in the local file system.
     * Asynchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     * 
     *  @returns Returns a promise that resolves when the file has been written.   
     */
    /*async*/ writeFile (filePath: string): Promise<void>;

    /**
     * Serialize the dataframe to a JSON file in the local file system.
     * Synchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     */
    writeFileSync (filePath: string): void;
}

/**
 * @hidden
 * Packages a dataframe ready for JSON serialization.
 */
class JsonSerializer<IndexT, ValueT> implements IJsonSerializer {

    dataframe: IDataFrame<IndexT, ValueT>;

    constructor (dataframe: IDataFrame<IndexT, ValueT>) {
        this.dataframe = dataframe;
    }

    /**
     * Serialize the dataframe to a JSON file in the local file system.
     * Asynchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     * 
     *  @returns Returns a promise that resolves when the file has been written.   
     */
    writeFile (filePath: string): Promise<void> {
        assert.isString(filePath, "Expected 'filePath' parameter to 'DataFrame.asJSON().writeFile' to be a string that specifies the path of the file to write to the local file system.");

        return new Promise((resolve, reject) => {
            var fs = require('fs');	
            fs.writeFile(filePath, this.dataframe.toJSON(), (err: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }

    /**
     * Serialize the dataframe to a JSON file in the local file system.
     * Synchronous version.
     * 
     * @param filePath - Specifies the output path for the file. 
     */
    writeFileSync (filePath: string): void {
        assert.isString(filePath, "Expected 'filePath' parameter to 'DataFrame.asJSON().writeFile' to be a string that specifies the path of the file to write to the local file system.");

        var fs = require('fs');	
        fs.writeFileSync(filePath, this.dataframe.toJSON());
    }
}

/**
 * @hidden
 * A dataframe that has been ordered.
 */
class OrderedDataFrame<IndexT = number, ValueT = any, SortT = any> 
    extends DataFrame<IndexT, ValueT>
    implements IOrderedDataFrame<IndexT, ValueT, SortT> {

    parent: OrderedDataFrame<IndexT, ValueT, SortT> | null;
    selector: SelectorWithIndexFn<ValueT, SortT>;
    direction: Direction;
    origValues: Iterable<ValueT>;
    origPairs: Iterable<[IndexT, ValueT]>;

    //
    // Helper function to create a sort spec.
    //
    private static makeSortSpec (sortLevel: number, selector: SortSelectorFn, direction: Direction): ISortSpec {
        return { sortLevel: sortLevel, selector: selector, direction: direction };
    }

    //
    // Helper function to make a sort selector for pairs, this captures the parent correct when generating the closure.
    //
    private static makePairsSelector (selector: SortSelectorFn): SortSelectorFn {
        return (pair: any, index: number) => selector(pair[1], index);
    }

    constructor(values: Iterable<ValueT>, pairs: Iterable<[IndexT, ValueT]>, selector: SelectorWithIndexFn<ValueT, SortT>, direction: Direction, parent: OrderedDataFrame<IndexT, ValueT> | null) {

        const valueSortSpecs: ISortSpec[] = [];
        const pairSortSpecs: ISortSpec[] = [];
        let sortLevel = 0;

        while (parent !== null) {
            valueSortSpecs.push(OrderedDataFrame.makeSortSpec(sortLevel, parent.selector, parent.direction));
            pairSortSpecs.push(OrderedDataFrame.makeSortSpec(sortLevel, OrderedDataFrame.makePairsSelector(parent.selector), parent.direction));
            ++sortLevel;
            parent = parent.parent;
        }

        valueSortSpecs.push(OrderedDataFrame.makeSortSpec(sortLevel, selector, direction));
        pairSortSpecs.push(OrderedDataFrame.makeSortSpec(sortLevel, OrderedDataFrame.makePairsSelector(selector), direction));

        super({
            values: new OrderedIterable(values, valueSortSpecs),
            pairs: new OrderedIterable(pairs, pairSortSpecs)
        });

        this.parent = parent;
        this.selector = selector;
        this.direction = direction;
        this.origValues = values;
        this.origPairs = pairs;
    }

    /** 
     * Performs additional sorting (ascending).
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new dataframe has been additionally sorted by the value returned by the selector. 
     */
    thenBy<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT> {
        //TODO: Should pass a config fn to OrderedSeries.
        return new OrderedDataFrame<IndexT, ValueT, SortT>(this.origValues, this.origPairs, selector, Direction.Ascending, this);
    }

    /** 
     * Performs additional sorting (descending).
     * 
     * @param selector Selects the value to sort by.
     * 
     * @returns Returns a new dataframe has been additionally sorted by the value returned by the selector. 
     */
    thenByDescending<SortT> (selector: SelectorWithIndexFn<ValueT, SortT>): IOrderedDataFrame<IndexT, ValueT, SortT> {
        //TODO: Should pass a config fn to OrderedSeries.
        return new OrderedDataFrame<IndexT, ValueT, SortT>(this.origValues, this.origPairs, selector, Direction.Descending, this);        
    }
}
    