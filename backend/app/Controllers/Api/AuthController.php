<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\UserModel;
use Config\Services;

class AuthController extends BaseController
{
	private function jsonPayload()
	{
		$body = file_get_contents('php://input');
		$payload = json_decode($body ?: '', true);

		if (is_array($payload)) {
			return $payload;
		}

		return $_POST;
	}

	private function respondValidationErrors(array $errors)
	{
		return $this->response->setStatusCode(422)->setJSON([
			'status' => 'error',
			'message' => 'Validation failed',
			'errors' => $errors,
		]);
	}

	private function userResponse(array $user)
	{
		return [
			'id' => (int) $user['id'],
			'username' => $user['username'],
		];
	}

	public function me()
	{
		$user = session()->get('auth_user');

		if (!$user) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Not authenticated',
			]);
		}

		return $this->response->setJSON([
			'status' => 'success',
			'user' => $user,
		]);
	}

	public function register()
	{
		$data = $this->jsonPayload();
		$rules = [
			'username' => 'required|min_length[3]|max_length[100]|is_unique[users.username]',
			'password' => 'required|min_length[6]|max_length[255]',
		];
		$validation = Services::validation();
		$validation->setRules($rules);

		if (!$validation->run($data)) {
			return $this->respondValidationErrors($validation->getErrors());
		}

		$userModel = new UserModel();
		$username = trim($data['username']);
		$password = (string) $data['password'];

		$userId = $userModel->insert([
			'username' => $username,
			'password_hash' => password_hash($password, PASSWORD_DEFAULT),
		], true);

		$user = $userModel->find($userId);
		$authUser = $this->userResponse($user);
		session()->set('auth_user', $authUser);

		return $this->response->setJSON([
			'status' => 'success',
			'message' => 'Account created',
			'user' => $authUser,
		]);
	}

	public function login()
	{
		$data = $this->jsonPayload();
		$rules = [
			'username' => 'required|min_length[3]|max_length[100]',
			'password' => 'required|min_length[6]|max_length[255]',
		];
		$validation = Services::validation();
		$validation->setRules($rules);

		if (!$validation->run($data)) {
			return $this->respondValidationErrors($validation->getErrors());
		}

		$userModel = new UserModel();
		$user = $userModel->where('username', trim($data['username']))->first();

		if (!$user || !password_verify((string) $data['password'], $user['password_hash'])) {
			return $this->response->setStatusCode(401)->setJSON([
				'status' => 'error',
				'message' => 'Invalid username or password',
			]);
		}

		$authUser = $this->userResponse($user);
		session()->set('auth_user', $authUser);

		return $this->response->setJSON([
			'status' => 'success',
			'message' => 'Logged in',
			'user' => $authUser,
		]);
	}

	public function logout()
	{
		session()->remove('auth_user');
		return $this->response->setJSON([
			'status' => 'success',
			'message' => 'Logged out',
		]);
	}
}