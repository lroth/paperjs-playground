<?php
session_start();

if(isset($_POST['image']) && isset($_POST['token'])) {
	$image = explode(',', $_POST['image'])[1];
	$_SESSION[$_POST['token']] = $image;
}
else if(isset($_GET['token'])) {
	if(isset($_SESSION[$_GET['token']])) {
		header("Pragma: public");
		header("Expires: 0");

		header("Cache-Control: must-revalidate, post-check=0, pre-check=0");
		header("Cache-Control: public"); 

		header("Content-Description: File Transfer");
		header('Content-Type: image/png');
		header('Content-Disposition: attachment; filename="canvas.png"');
		header("Content-Transfer-Encoding: binary");
		header('Content-Type: application/octet-stream');

		$image = $_SESSION[$_GET['token']];

		file_put_contents('./canvas/canvas.png', base64_decode($image));
		echo base64_decode($image);
	}
}
?>