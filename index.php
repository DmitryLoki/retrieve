<?php 

$tmpl = join("",file("index.html"));
$tmpl = str_replace("<!-- contestId -->",$_GET["contestId"] ? $_GET["contestId"] : "cnts-130530-264712753",$tmpl);
$tmpl = str_replace("<!-- raceId -->",$_GET["raceId"] ? $_GET["raceId"] : "r-d3215c15-ce48-4914-b658-b5cd46ac2f98",$tmpl);
$tmpl = str_replace("<!-- apiVersion -->",$_GET["apiVersion"] ? $_GET["apiVersion"] : "v0.2",$tmpl);

echo $tmpl;
