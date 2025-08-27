CREATE OR REPLACE FUNCTION contains_inappropriate_content(text_to_check TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    text_to_check := LOWER(text_to_check);
    
    IF text_to_check ~ 'porn|pornography|xxx|adult content|explicit' THEN
        RETURN TRUE;
    END IF;
    
    IF text_to_check ~ 'fuck|shit|bitch|asshole|dick|cock|pussy|whore|slut|bastard|motherfucker|faggot|nigger|nigga' THEN
        RETURN TRUE;
    END IF;
    
    IF text_to_check ~ 'cocaine|heroin|meth|weed|marijuana|drugs|drug use|getting high|stoned' THEN
        RETURN TRUE;
    END IF;
    
    IF text_to_check ~ 'kill yourself|suicide|murder|rape|assault|violence' THEN
        RETURN TRUE;
    END IF;
    
    IF text_to_check ~ 'hate speech|racist|sexist|homophobic|transphobic' THEN
        RETURN TRUE;
    END IF;
    
    IF text_to_check ~ 'nude|naked|sex|sexual|erotic|lewd|obscene' THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

SELECT 'QUOTES TABLE EXAMPLES:' as info;

SELECT 
    id,
    author,
    LEFT(quote, 50) as quote_preview
FROM public.quotes
WHERE contains_inappropriate_content(quote) OR contains_inappropriate_content(author)
LIMIT 5;

SELECT 'LONGQUOTES TABLE EXAMPLES:' as info;

SELECT 
    id,
    author,
    LEFT(quote, 50) as quote_preview
FROM public.longquotes
WHERE contains_inappropriate_content(quote) OR contains_inappropriate_content(author)
LIMIT 5;

DROP FUNCTION IF EXISTS contains_inappropriate_content(TEXT);
