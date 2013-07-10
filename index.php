<?php 

error_reporting(0);

$tmpl = join("",file("index.html"));
$tmpl = str_replace("<!-- contestId -->",$_GET["contestid"], $tmpl);
$tmpl = str_replace("<!-- raceId -->",$_GET["raceid"], $tmpl);
$tmpl = str_replace("<!-- apiVersion -->",$_GET["apiVersion"] ? $_GET["apiVersion"] : "v0.2",$tmpl);

echo $tmpl;
