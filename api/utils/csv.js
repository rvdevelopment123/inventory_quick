
// Helper for CSV generation
const convertToCSV = (data) => {
    if (!data || data.length === 0) {
        return '';
    }

    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';

    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(value => {
            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Convert value to string for checking
            const stringValue = String(value);

            // Escape special characters (quotes, commas, newlines)
            if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        }).join(',')
    );

    return BOM + [header, ...rows].join('\n');
};

class CsvExporter {
    static toCsv(data) {
        return convertToCSV(data);
    }
}

module.exports = { CsvExporter, convertToCSV };
