#!/usr/bin/env python

"""Set up the MEXPRESS database

Usage:
python python/database_setup.py -h | --help
python python/database_setup.py \\
-i | --ini config_file \\
-s | --sql sql_file

Options:
-h | --help: show the help message
config_file: path to the config.ini file that contains the login
             details for the MEXPRESS database
sql_file: path to the .sql file that contains the commands to set up
          the MEXPRESS MySQL database
"""

import ConfigParser
import getopt
import pymysql
import sys

from contextlib import closing


def execute_sql_commands(login_info, commands):
	conn = pymysql.connect(host=login_info['host'], user=login_info['username'],
						   password=login_info['password'])
	try:
		with closing(conn.cursor()) as cur:
			for cmd in commands:
				cur.execute(cmd)
		conn.commit()
	except Exception as e:
		raise e


def help():
	print __doc__
	sys.exit(0)


def get_database_info(config_file):
	config = ConfigParser.ConfigParser()
	config.read(config_file)
	login_info = {}
	login_info['host'] = config.get('database', 'host')
	login_info['database'] = config.get('database', 'dbname')
	login_info['username'] = config.get('database', 'username')
	login_info['password'] = config.get('database', 'password')
	return login_info


def main(argv):
	try:
		opts, args = getopt.getopt(argv, 's:i:h', ['sql=', 'ini='])
	except getopt.GetoptError as err:
		print str(err)
		help()
	sql_file = ''
	config_file = ''
	for opt, arg in opts:
		if opt in ('-h', '--help'):
			help()
		elif opt in ('-s', '--sql'):
			sql_file = arg
		elif opt in ('-i', '--ini'):
			config_file = arg
	if sql_file == '' or config_file == '':
		print 'Please check that you did not forget any files.'
		help()
	print 'Setting up the MEXPRESS database...'
	sql_commands = read_sql_file(sql_file)
	login_info = get_database_info(config_file)
	execute_sql_commands(login_info, sql_commands)
	print 'Done!'


def read_sql_file(file):
	commands = []
	try:
		with open(file, 'r') as fh:
			content = fh.read()
		commands = content.strip().split(';')
		commands = [x for x in commands if x != '']
	except Exception as e:
		raise e
	return commands


if __name__ == '__main__':
	main(sys.argv[1:])
