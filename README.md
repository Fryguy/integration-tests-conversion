# integration-tests-conversion

## On the remote system

1. Get a system that has integration-tests installed, runnable, and in the
   cfme_venv.
2. `pip install py2rb`
3. Apply the changes from [here](https://github.com/Fryguy/py2rb/commit/7dde4eb217c639c45aca52e1bc51fbeba3347442)
   onto the `.cfme_venv/lib/python3.7/site-packages/py2rb/__init__.py` file
4. Copy `convert2rb` to the system bin dir.
5. Run `convert2rb`.

## On the local system

1. rsync the files into the rb directory

   ```
   rsync -r -v <system>:/tmp/rbfiles/* .
   ```
2. Run `convert2js`
