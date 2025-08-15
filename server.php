<?php
// Der Dateipfad zur .mjs Datei
ini_set( 'memory_limit', -1 );


$filename = getcwd().$_SERVER['REQUEST_URI']; // Ersetze dies durch den tatsächlichen Dateipfad

// Überprüfen, ob die Datei existiert
if (file_exists($filename) && (strpos($filename, '.js') !== false || strpos($filename, '.mjs') !== false)) {
    // Setze den Content-Type Header
    header('Content-Type: text/javascript');
} else {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime_type = finfo_file($finfo, $filename);
    // Datei nicht gefunden, sende einen 404-Header
    header('Content-Type: ' . $mime_type);
}

// Lese den Dateiinhalt und gib ihn aus
if (file_exists($filename) && !is_dir($filename))
    readfile($filename);

?>
