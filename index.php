<?php 

error_reporting(0);

$tmpl = join("",file("index.html"));
$tmpl = str_replace("<!-- contestId -->",$_GET["contestId"] ? $_GET["contestId"] : "",$tmpl);
$tmpl = str_replace("<!-- raceId -->",$_GET["raceId"] ? $_GET["raceId"] : "",$tmpl);
$tmpl = str_replace("<!-- apiVersion -->",$_GET["apiVersion"] ? $_GET["apiVersion"] : "v0.2",$tmpl);

echo $tmpl;
