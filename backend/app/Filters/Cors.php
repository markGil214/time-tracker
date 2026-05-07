<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;

class Cors implements FilterInterface
{
    /**
     * @param RequestInterface $request
     * @param array|null       $arguments
     *
     * @return mixed
     */
    public function before(RequestInterface $request, $arguments = null)
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowedOrigins = [
            'https://time-tracker-three-eta.vercel.app',
            'http://localhost:5173', // For local dev
        ];

        // If the origin is from an ngrok domain, allow it too
        if (strpos($origin, 'ngrok-free.app') !== false) {
            $allowedOrigins[] = $origin;
        }

        if (in_array($origin, $allowedOrigins)) {
            header("Access-Control-Allow-Origin: " . $origin);
            header("Access-Control-Allow-Headers: X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization, Set-Cookie");
            header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
            header("Access-Control-Allow-Credentials: true");
        }

        if ($request->getMethod() === 'options') {
            $response = service('response');
            $response->setStatusCode(200);
            return $response->send();
        }
    }

    /**
     * @param RequestInterface  $request
     * @param ResponseInterface $response
     * @param array|null        $arguments
     *
     * @return mixed
     */
    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
        //
    }
}
