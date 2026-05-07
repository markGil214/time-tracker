<?php

namespace Config;

// Create a new instance of our RouteCollection class.
$routes = Services::routes();

// Load the system's routing file first, so that the app and ENVIRONMENT
// can override as needed.
if (file_exists(SYSTEMPATH . 'Config/Routes.php'))
{
	require SYSTEMPATH . 'Config/Routes.php';
}

/**
 * --------------------------------------------------------------------
 * Router Setup
 * --------------------------------------------------------------------
 */
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Home');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(false);
$routes->set404Override();
$routes->setAutoRoute(true);

/*
 * --------------------------------------------------------------------
 * Route Definitions
 * --------------------------------------------------------------------
 */

// We get a performance increase by specifying the default
// route since we don't have to scan directories.
$routes->get('/', 'Home::index');

$routes->group('api/auth', static function ($routes) {
	$routes->post('register', 'Api\\AuthController::register');
	$routes->post('login', 'Api\\AuthController::login');
	$routes->post('logout', 'Api\\AuthController::logout');
	$routes->get('me', 'Api\\AuthController::me');
});

$routes->group('api/entries', static function ($routes) {
	$routes->get('/', 'Api\\EntriesController::index');
	$routes->post('/', 'Api\\EntriesController::create');
	$routes->put('(:num)', 'Api\\EntriesController::update/$1');
	$routes->put('(:num)/notes', 'Api\\EntriesController::notes/$1');
	$routes->delete('(:num)', 'Api\\EntriesController::delete/$1');
});

/*
 * --------------------------------------------------------------------
 * Additional Routing
 * --------------------------------------------------------------------
 *
 * There will often be times that you need additional routing and you
 * need it to be able to override any defaults in this file. Environment
 * based routes is one such time. require() additional route files here
 * to make that happen.
 *
 * You will have access to the $routes object within that file without
 * needing to reload it.
 */
if (file_exists(APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php'))
{
	require APPPATH . 'Config/' . ENVIRONMENT . '/Routes.php';
}
