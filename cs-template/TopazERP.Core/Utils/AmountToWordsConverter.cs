using System;

namespace TopazERP.Utils;

public static class AmountToWordsConverter
{
      private static readonly string[] Ones = 
    { 
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", 
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", 
        "Seventeen", "Eighteen", "Nineteen" 
    };

    private static readonly string[] Tens = 
    { 
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" 
    };

    private static readonly string[] Thousands = 
    { 
        "", "Thousand", "Million", "Billion", "Trillion" 
    };

    /// <summary>
    /// Converts a decimal amount into words with custom currency names and "ONLY" formatting.
    /// </summary>
    public static string Convert(decimal amount, string majorCurrency = "Ghana Cedis", string minorCurrency = "Pesewas")
    {
        if (amount == 0) 
            return $"Zero {majorCurrency} ONLY";

        if (amount < 0)
            return "Negative " + Convert(Math.Abs(amount), majorCurrency, minorCurrency);

        long majorUnits = (long)Math.Truncate(amount);
        int minorUnits = (int)Math.Round((amount - majorUnits) * 100);

        string majorWords = ConvertInteger(majorUnits);
        
        // Scenario 1: Both Major and Minor currency exist
        if (majorUnits > 0 && minorUnits > 0)
        {
            string minorWords = ConvertInteger(minorUnits);
            return $"{majorWords} {majorCurrency} ONLY and {minorWords} {minorCurrency}";
        }
        
        // Scenario 2: Only Major currency exists
        if (majorUnits > 0)
        {
            return $"{majorWords} {majorCurrency} ONLY";
        }
        
        // Scenario 3: Only Minor currency exists (e.g., 0.85)
        return $"{ConvertInteger(minorUnits)} {minorCurrency} ONLY";
    }

    private static string ConvertInteger(long number)
    {
        if (number == 0) return "Zero";

        string words = "";
        int group = 0;

        while (number > 0)
        {
            if (number % 1000 != 0)
            {
                string groupWords = ConvertChunk((int)(number % 1000));
                
                if (!string.IsNullOrEmpty(Thousands[group]))
                {
                    groupWords += " " + Thousands[group];
                }

                // Injects a comma (, ) instead of a space when merging numerical groups
                words = groupWords + (string.IsNullOrEmpty(words) ? "" : ", " + words);
            }

            number /= 1000;
            group++;
        }

        return words.Trim();
    }

    private static string ConvertChunk(int number)
    {
        string words = "";

        if (number >= 100)
        {
            words += Ones[number / 100] + " Hundred";
            number %= 100;
            if (number > 0) words += " and "; 
        }

        if (number > 0)
        {
            if (number < 20)
            {
                words += Ones[number];
            }
            else
            {
                words += Tens[number / 10];
                if (number % 10 > 0)
                {
                    // Replaced the hyphen with a space to match "Eighty Five" format
                    words += " " + Ones[number % 10]; 
                }
            }
        }

        return words.Trim();
    }
}
 